#!/usr/bin/env node
// Node 18+
// Author: Zion Emond

const { Command, Option } = require('commander');
const pkg = require('./package.json');


const metaobjectDefinitionsQuery = `{
  metaobjectDefinitions(first: 250) {
    edges {
      node {
        id
        name
        description
        type
        fieldDefinitions {
          description
          key
          name
          required
          type {
            name
          }
          validations {
            name
            value
          }
        }
      }
    }
  }
}`;

const createMetaObjectsDefinitionMutation = `
mutation CreateMetaObjectDefinition($definition:MetaobjectDefinitionCreateInput!) {
  metaobjectDefinitionCreate(definition: $definition) {
    metaobjectDefinition {
      name
      description
      type
      fieldDefinitions {
        description
        key
        name
        required
        type {
          name
        }
        validations {
          name
          value
        }
      }
    }
    userErrors {
      field
      message
      code
    }
  }
}`;

const createMetafieldMutation = `
mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition {
      id
      name
    }
    userErrors {
      field
      message
      code
    }
  }
}`;

function getMetafieldDefinitionsQuery(ownerType) {
  return `{
    metafieldDefinitions(first: 250, ownerType: ${ownerType}) {
      edges {
        node {
          id
          namespace
          key
          ownerType
          description
          name
          type {
            name
            category
          }
        }
      }
    }
  }`;
};

function buildApiEndpoint(store, apiVersion = '2025-07') {
  return `https://${store}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
}

async function graphqlRequest(graphqlEndpoint, authToken, query, variables = {}) {
  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': authToken
    },
    body: JSON.stringify({
      query,
      variables
    })
  });

  const result = await response.json();

  if (result.errors) {
    console.log('result: ', JSON.stringify(result, null, 2));
    console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
    throw new Error('GraphQL query failed');
  }

  return result.data;
}


async function copyMetaobjectDefinitions(sourceStore, sourceToken, targetStore, targetToken, apiVersion = '2025-07') {
  const SOURCE_ENDPOINT = buildApiEndpoint(sourceStore, apiVersion);
  const TARGET_ENDPOINT = buildApiEndpoint(targetStore, apiVersion);
    try {
        const sourceMetaobjectDefinitions = await graphqlRequest(SOURCE_ENDPOINT, sourceToken, metaobjectDefinitionsQuery);
        const sourceMetaObjectsArray = sourceMetaobjectDefinitions.metaobjectDefinitions.edges.map((edge => 
            {
                const {id, fieldDefinitions, ...rest} = edge.node;
                const flattenedFieldDefinitions = fieldDefinitions.map(field => ({
                    ...field,
                    type: field.type.name
                }));
                return {
                    ...rest,
                    fieldDefinitions: flattenedFieldDefinitions
                }
            }
        ));

        // eslint-disable-next-line prefer-const
        // let definitionsWithMetaobjectReferences = [];
        for (const metaObjectDefinition of sourceMetaObjectsArray) {
          console.log(`************ CREATING METAOBJECT DEFINITION FOR ${metaObjectDefinition.name} *************************`);
          let hasMetaobjectReference = false;
          for (const fieldDefinition of metaObjectDefinition.fieldDefinitions) {
            if (fieldDefinition.type === 'metaobject_reference') {
              // definitionsWithMetaobjectReferences.push(metaObjectDefinition);
              hasMetaobjectReference = true;
            }
          }

          if (!hasMetaobjectReference) {
            const variables = {
                definition: metaObjectDefinition
            }
            const targetCreateMetaobjectDefinitionsResponse = await graphqlRequest(TARGET_ENDPOINT, targetToken, createMetaObjectsDefinitionMutation, variables);
            // console.log('response: ', JSON.stringify(targetCreateMetaobjectDefinitionsResponse, null, 2));

            if (targetCreateMetaobjectDefinitionsResponse.metaobjectDefinitionCreate && targetCreateMetaobjectDefinitionsResponse.metaobjectDefinitionCreate.userErrors && targetCreateMetaobjectDefinitionsResponse.metaobjectDefinitionCreate.userErrors.length) {
              console.error('Failed to create metaobject definition for: ', metaObjectDefinition.name);
              const userErrors = targetCreateMetaobjectDefinitionsResponse.metaobjectDefinitionCreate.userErrors
              console.error('User Errors: ', userErrors);

              console.log('original variables: ', JSON.stringify(variables, null, 2));
            } else {
              console.log('successfully created metaobject definition for: ', metaObjectDefinition.name);
            }
          }
        }

        // This was an unsuccessful (probably not very smart to begin with) experiment to try and get the correct ID for a metaobject reference.
        // Maybe it could be changed to actually work in the future, who knows.
        /*
        // wait to try to create the ones with metaobject references in case they reference other metaobjects we were copying
        if (definitionsWithMetaobjectReferences.length) {
          const targetMetaobjectDefinitions = await graphqlRequest(TARGET_ENDPOINT, targetToken, metaobjectDefinitionsQuery);
          const targetMetaObjectsArray = targetMetaobjectDefinitions.metaobjectDefinitions.edges.map((edge => 
            {
                const {id, fieldDefinitions, ...rest} = edge.node;
                const flattenedFieldDefinitions = fieldDefinitions.map(field => ({
                    ...field,
                    type: field.type.name
                }));
                return {
                    ...rest,
                    fieldDefinitions: flattenedFieldDefinitions
                }
            }
          ));
          for (const definition of definitionsWithMetaobjectReferences) {
            for (const fieldDefinition of definition.fieldDefinitions) {
              if (fieldDefinition.type === 'metaobject_reference') {
                // try to figure out referenced metaobject based on the field definition's key
                const key = fieldDefinition.key;

                const matchingMetaobjectDefinition = targetMetaObjectsArray.find(objectDefinition => objectDefinition.fieldDefinitions.find(field => field.key === key));

                if (matchingMetaobjectDefinition && matchingMetaobjectDefinition.id) {
                  const validation = fieldDefinition.validations.find(validation => validation.name === 'metaobject_definition_id');
                  validation.value = matchingMetaobjectDefinition.id;
                }
              }
            }
            console.log('definition: ', JSON.stringify(definition, null, 2));
            const variables = {
                definition
            }
            const targetCreateMetaobjectDefinitionsResponse = await graphqlRequest(TARGET_ENDPOINT, targetToken, createMetaObjectsDefinitionMutation, variables);
            // console.log('response: ', JSON.stringify(targetCreateMetaobjectDefinitionsResponse, null, 2));

            if (targetCreateMetaobjectDefinitionsResponse.metaobjectDefinitionCreate && targetCreateMetaobjectDefinitionsResponse.metaobjectDefinitionCreate.userErrors && targetCreateMetaobjectDefinitionsResponse.metaobjectDefinitionCreate.userErrors.length) {
              console.error('Failed to create metaobject definition for: ', definition.name);
              const userErrors = targetCreateMetaobjectDefinitionsResponse.metaobjectDefinitionCreate.userErrors
              console.error('User Errors: ', userErrors);

              console.log('original variables: ', JSON.stringify(variables, null, 2));
            } else {
              console.log('successfully created metaobject definition for: ', definition.name);
            }
          }
        }*/

    } catch (err) {
        console.error('GraphQL request failed:', err.message);
    }
}

async function copyMetafieldDefinitions(sourceStore, sourceToken, targetStore, targetToken, shopifyObjectTypes, apiVersion = '2025-07') {
  const SOURCE_ENDPOINT = buildApiEndpoint(sourceStore, apiVersion);
  const TARGET_ENDPOINT = buildApiEndpoint(targetStore, apiVersion);

  const objectTypes = shopifyObjectTypes.split(',');
  for (const objectType of objectTypes) {
    const query = getMetafieldDefinitionsQuery(objectType);
    try {
        const sourceMetafieldDefinitions = await graphqlRequest(SOURCE_ENDPOINT, sourceToken, query);
        const sourceMetafieldArray = sourceMetafieldDefinitions.metafieldDefinitions.edges.map((edge => 
            {
                const {id, type, ...rest} = edge.node;
                return {
                    ...rest,
                    type: type.name
                }
            }
        ));

        for (const metafieldDefinition of sourceMetafieldArray) {
          console.log(`************ CREATING METAFIELD DEFINITION FOR ${metafieldDefinition.name} *************************`);
          const variables = {
              definition: metafieldDefinition
          }
          try {
            const targetCreateMetafieldDefinitionsResponse = await graphqlRequest(TARGET_ENDPOINT, targetToken, createMetafieldMutation, variables);
            // console.log('response: ', JSON.stringify(targetCreateMetafieldDefinitionsResponse, null, 2));

            if (targetCreateMetafieldDefinitionsResponse.metafieldDefinitionCreate && targetCreateMetafieldDefinitionsResponse.metafieldDefinitionCreate.userErrors && targetCreateMetafieldDefinitionsResponse.metafieldDefinitionCreate.userErrors.length) {
              console.error('Failed to create metafield definition for: ', metafieldDefinition.name);
              const userErrors = targetCreateMetafieldDefinitionsResponse.metafieldDefinitionCreate.userErrors
              console.error('User Errors: ', userErrors);

              console.log('original variables: ', JSON.stringify(variables, null, 2));
            } else {
              console.log('successfully created metafield definition for: ', metafieldDefinition.name);
            }
          } catch (e) {
            console.error('GraphQL request failed:', e.message);
          }
        }

    } catch (err) {
        console.error('GraphQL request failed:', err.message);
    }
  }
}

const program = new Command();

program
  .name('shopify-metadata-migrator')
  .description('Migrates Shopify Metafield and Metaobject definitions from the Source Shopify site to the Target Shopify site. NOTE: This will not copy and will skip over metaobject definitions that have fields with metaobject references, and also metafields that are metaobject references. Creating those programmatically via API is difficult, as it requires having the ID of the desired metaobject to reference')
  .version(pkg.version)
  .showHelpAfterError(true)
  .enablePositionalOptions()
  .passThroughOptions();

program
  .requiredOption('-s, --sourceStore <shopify-store>', 'Source Shopify store domain (required)')
  .requiredOption('-S, --sourceToken <access-token>', 'Source Shopify access token (required)')
  .requiredOption('-t, --targetStore <shopify-store>', 'Target Shopify store domain (required)')
  .requiredOption('-T, --targetToken <access-token>', 'Target Shopify access token (required)')
  .option('-m, --metafields', 'Flag indicating that metafield definitions should be migrated')
  .option('-M, --metaobjects', 'Flag indicating that metaobject definitions should be migrated')
  .option('-o, --shopifyObjectTypes <types>', 'Comma separated list of object types (for copying metafields), eg: PRODUCT,PRODUCTVARIANT,COLLECTION etc. See: https://shopify.dev/docs/api/admin-graphql/2024-04/enums/MetafieldOwnerType for more types that may or may not work with this tool.')
  .option('-a, --apiVersion <version>', 'Shopify API version to use', '2025-07');

program.parse(process.argv);

const options = program.opts();

if (!options.metaobjects && !options.metafields) {
  console.error('Please specify --metafields and/or --metaobjects');
  process.exit(1);
}

if (options.metaobjects) {
  copyMetaobjectDefinitions(options.sourceStore, options.sourceToken, options.targetStore, options.targetToken, options.apiVersion || '2025-07');
}

if (options.metafields) {
  if (!options.shopifyObjectTypes) {
    console.error('--shopifyObjectTypes is required. Use --help for more information.');
    process.exit(1);
  }
  copyMetafieldDefinitions(options.sourceStore, options.sourceToken, options.targetStore, options.targetToken, options.shopifyObjectTypes, options.apiVersion || '2025-07');
}