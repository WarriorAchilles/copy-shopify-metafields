#!/usr/bin/env node
// Node 18+
// Author: Zion Emond

const { Command } = require('commander');
const pkg = require('./package.json');

// Loading spinner utility
class LoadingSpinner {
  constructor(message = 'Loading...') {
    this.message = message;
    this.spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.currentIndex = 0;
    this.interval = null;
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.interval = setInterval(() => {
      process.stdout.write(
        `\r${this.spinner[this.currentIndex]} ${this.message}`
      );
      this.currentIndex = (this.currentIndex + 1) % this.spinner.length;
    }, 80);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    process.stdout.write('\r' + ' '.repeat(this.message.length + 2) + '\r');
  }

  updateMessage(message) {
    this.message = message;
  }
}

// Logger and run summary (set after parsing CLI options)
let logLevel = 'normal'; // 'quiet' | 'normal' | 'verbose' | 'debug'
let logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  verbose: () => {},
  debug: () => {},
};
const runSummary = {
  metaobjects: { processed: 0, created: 0, failed: 0, details: [] },
  metafields: { processed: 0, created: 0, failed: 0, details: [] },
  errors: [],
};

function initializeLogger(level) {
  logLevel = level;
  const isQuiet = level === 'quiet';
  const isVerbose = level === 'verbose' || level === 'debug';
  const isDebug = level === 'debug';

  logger = {
    info: (...args) => {
      if (!isQuiet) console.log(...args);
    },
    warn: (...args) => {
      if (!isQuiet) console.warn(...args);
    },
    error: (...args) => {
      if (!isQuiet) console.error(...args);
    },
    verbose: (...args) => {
      if (isVerbose) console.log(...args);
    },
    debug: (...args) => {
      if (isDebug) console.debug(...args);
    },
  };
}

function recordError(context, err) {
  const message = err?.message || String(err);
  runSummary.errors.push({ context, message });
  logger.error(context + ':', message);
}

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
}

function buildApiEndpoint(store, apiVersion = '2025-07') {
  return `https://${store}.myshopify.com/admin/api/${apiVersion}/graphql.json`;
}

async function graphqlRequest(
  graphqlEndpoint,
  authToken,
  query,
  variables = {}
) {
  logger.debug('GraphQL Request:', {
    endpoint: graphqlEndpoint,
    // Do not log tokens
    query,
    variables,
  });

  const response = await fetch(graphqlEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': authToken,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const result = await response.json();
  logger.debug('GraphQL Response:', result);

  if (result.errors) {
    logger.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
    throw new Error('GraphQL query failed');
  }

  return result.data;
}

async function copyMetaobjectDefinitions(
  sourceStore,
  sourceToken,
  targetStore,
  targetToken,
  apiVersion = '2025-07'
) {
  const SOURCE_ENDPOINT = buildApiEndpoint(sourceStore, apiVersion);
  const TARGET_ENDPOINT = buildApiEndpoint(targetStore, apiVersion);
  try {
    const sourceMetaobjectDefinitions = await graphqlRequest(
      SOURCE_ENDPOINT,
      sourceToken,
      metaobjectDefinitionsQuery
    );
    const sourceMetaObjectsArray =
      sourceMetaobjectDefinitions.metaobjectDefinitions.edges.map(edge => {
        const { id: _id, fieldDefinitions, ...rest } = edge.node;
        const flattenedFieldDefinitions = fieldDefinitions.map(field => ({
          ...field,
          type: field.type.name,
        }));
        return {
          ...rest,
          fieldDefinitions: flattenedFieldDefinitions,
        };
      });

    logger.info(
      `Found ${sourceMetaObjectsArray.length} metaobject definitions to migrate`
    );

    for (let i = 0; i < sourceMetaObjectsArray.length; i++) {
      const metaObjectDefinition = sourceMetaObjectsArray[i];
      runSummary.metaobjects.processed += 1;

      // Update spinner with progress
      if (global.spinner) {
        global.spinner.updateMessage(
          `Migrating metaobject ${i + 1}/${sourceMetaObjectsArray.length}: ${metaObjectDefinition.name}`
        );
      }

      logger.info(
        `************ CREATING METAOBJECT DEFINITION FOR ${metaObjectDefinition.name} *************************`
      );

      // Verbose: show field details without GraphQL internals
      logger.verbose(
        `Fields for ${metaObjectDefinition.name}: ` +
          metaObjectDefinition.fieldDefinitions
            .map(
              f =>
                `${f.key || f.name}:${f.type}${f.required ? ' (required)' : ''}`
            )
            .join(', ')
      );

      let hasMetaobjectReference = false;
      for (const fieldDefinition of metaObjectDefinition.fieldDefinitions) {
        if (fieldDefinition.type === 'metaobject_reference') {
          hasMetaobjectReference = true;
        }
      }

      if (!hasMetaobjectReference) {
        const variables = {
          definition: metaObjectDefinition,
        };
        try {
          const targetCreateMetaobjectDefinitionsResponse =
            await graphqlRequest(
              TARGET_ENDPOINT,
              targetToken,
              createMetaObjectsDefinitionMutation,
              variables
            );

          if (
            targetCreateMetaobjectDefinitionsResponse.metaobjectDefinitionCreate &&
            targetCreateMetaobjectDefinitionsResponse.metaobjectDefinitionCreate
              .userErrors &&
            targetCreateMetaobjectDefinitionsResponse.metaobjectDefinitionCreate
              .userErrors.length
          ) {
            runSummary.metaobjects.failed += 1;
            const userErrors =
              targetCreateMetaobjectDefinitionsResponse
                .metaobjectDefinitionCreate.userErrors;
            logger.error(
              'Failed to create metaobject definition for:',
              metaObjectDefinition.name
            );
            logger.verbose('User Errors:', userErrors);
            logger.debug(
              'Original variables:',
              JSON.stringify(variables, null, 2)
            );
            runSummary.metaobjects.details.push({
              name: metaObjectDefinition.name,
              status: 'failed',
              userErrors,
            });
          } else {
            runSummary.metaobjects.created += 1;
            logger.info(
              'Successfully created metaobject definition for:',
              metaObjectDefinition.name
            );
            runSummary.metaobjects.details.push({
              name: metaObjectDefinition.name,
              status: 'created',
            });
          }
        } catch (e) {
          recordError(
            `GraphQL request failed while creating metaobject definition for ${metaObjectDefinition.name}`,
            e
          );
          runSummary.metaobjects.failed += 1;
          runSummary.metaobjects.details.push({
            name: metaObjectDefinition.name,
            status: 'failed',
            error: e?.message || String(e),
          });
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
    }
  } catch (err) {
    recordError(
      'GraphQL request failed while fetching source metaobject definitions',
      err
    );
  }
}

async function copyMetafieldDefinitions(
  sourceStore,
  sourceToken,
  targetStore,
  targetToken,
  shopifyObjectTypes,
  apiVersion = '2025-07'
) {
  const SOURCE_ENDPOINT = buildApiEndpoint(sourceStore, apiVersion);
  const TARGET_ENDPOINT = buildApiEndpoint(targetStore, apiVersion);

  const objectTypes = shopifyObjectTypes.split(',');
  for (const objectType of objectTypes) {
    const query = getMetafieldDefinitionsQuery(objectType);
    try {
      const sourceMetafieldDefinitions = await graphqlRequest(
        SOURCE_ENDPOINT,
        sourceToken,
        query
      );
      const sourceMetafieldArray =
        sourceMetafieldDefinitions.metafieldDefinitions.edges.map(edge => {
          const { id: _id, type, ...rest } = edge.node;
          return {
            ...rest,
            type: type.name,
          };
        });

      logger.info(
        `Found ${sourceMetafieldArray.length} metafield definitions for ${objectType} to migrate`
      );

      for (let i = 0; i < sourceMetafieldArray.length; i++) {
        const metafieldDefinition = sourceMetafieldArray[i];
        runSummary.metafields.processed += 1;

        // Update spinner with progress
        if (global.spinner) {
          global.spinner.updateMessage(
            `Migrating metafield ${i + 1}/${sourceMetafieldArray.length} for ${objectType}: ${metafieldDefinition.name}`
          );
        }

        logger.info(
          `************ CREATING METAFIELD DEFINITION FOR ${metafieldDefinition.name} *************************`
        );

        // Verbose: show what is being updated (namespace, key, type, ownerType)
        logger.verbose(
          `Definition ${metafieldDefinition.namespace}.${metafieldDefinition.key} ` +
            `(type: ${metafieldDefinition.type}, ownerType: ${metafieldDefinition.ownerType})`
        );

        const variables = {
          definition: metafieldDefinition,
        };
        try {
          const targetCreateMetafieldDefinitionsResponse = await graphqlRequest(
            TARGET_ENDPOINT,
            targetToken,
            createMetafieldMutation,
            variables
          );

          if (
            targetCreateMetafieldDefinitionsResponse.metafieldDefinitionCreate &&
            targetCreateMetafieldDefinitionsResponse.metafieldDefinitionCreate
              .userErrors &&
            targetCreateMetafieldDefinitionsResponse.metafieldDefinitionCreate
              .userErrors.length
          ) {
            runSummary.metafields.failed += 1;
            const userErrors =
              targetCreateMetafieldDefinitionsResponse.metafieldDefinitionCreate
                .userErrors;
            logger.error(
              'Failed to create metafield definition for:',
              metafieldDefinition.name
            );
            logger.verbose('User Errors:', userErrors);
            logger.debug(
              'Original variables:',
              JSON.stringify(variables, null, 2)
            );
            runSummary.metafields.details.push({
              name: metafieldDefinition.name,
              status: 'failed',
              userErrors,
            });
          } else {
            runSummary.metafields.created += 1;
            logger.info(
              'Successfully created metafield definition for:',
              metafieldDefinition.name
            );
            runSummary.metafields.details.push({
              name: metafieldDefinition.name,
              status: 'created',
            });
          }
        } catch (e) {
          recordError(
            `GraphQL request failed while creating metafield definition for ${metafieldDefinition.name}`,
            e
          );
          runSummary.metafields.failed += 1;
          runSummary.metafields.details.push({
            name: metafieldDefinition.name,
            status: 'failed',
            error: e?.message || String(e),
          });
        }
      }
    } catch (err) {
      recordError(
        `GraphQL request failed while fetching source metafield definitions for ownerType ${objectType}`,
        err
      );
    }
  }
}

function printFinalSummary() {
  const lines = [];
  lines.push('--- Migration Summary ---');
  lines.push(
    `Metaobjects: processed=${runSummary.metaobjects.processed}, created=${runSummary.metaobjects.created}, failed=${runSummary.metaobjects.failed}`
  );
  lines.push(
    `Metafields: processed=${runSummary.metafields.processed}, created=${runSummary.metafields.created}, failed=${runSummary.metafields.failed}`
  );

  // The summary is always printed. In quiet mode, it's the main output.
  console.log(lines.join('\n'));

  if (runSummary.errors.length && logLevel !== 'quiet') {
    console.log('Errors encountered:');
    for (const e of runSummary.errors) {
      console.log(`- ${e.context}: ${e.message}`);
    }
  }
}

const program = new Command();

program
  .name('shopify-metadata-migrator')
  .description(
    'Migrates Shopify Metafield and Metaobject definitions from the Source Shopify site to the Target Shopify site. NOTE: This will not copy and will skip over metaobject definitions that have fields with metaobject references, and also metafields that are metaobject references. Creating those programmatically via API is difficult, as it requires having the ID of the desired metaobject to reference'
  )
  .version(pkg.version)
  .showHelpAfterError(true)
  .enablePositionalOptions()
  .passThroughOptions();

program
  .requiredOption(
    '-s, --sourceStore <shopify-store>',
    'Source Shopify store domain (required)'
  )
  .requiredOption(
    '-S, --sourceToken <access-token>',
    'Source Shopify access token (required)'
  )
  .requiredOption(
    '-t, --targetStore <shopify-store>',
    'Target Shopify store domain (required)'
  )
  .requiredOption(
    '-T, --targetToken <access-token>',
    'Target Shopify access token (required)'
  )
  .option(
    '-m, --metafields',
    'Flag indicating that metafield definitions should be migrated'
  )
  .option(
    '-M, --metaobjects',
    'Flag indicating that metaobject definitions should be migrated'
  )
  .option(
    '-o, --shopifyObjectTypes <types>',
    'Comma separated list of object types (for copying metafields), eg: PRODUCT,PRODUCTVARIANT,COLLECTION etc. See: https://shopify.dev/docs/api/admin-graphql/2024-04/enums/MetafieldOwnerType for more types that may or may not work with this tool.'
  )
  .option('-a, --apiVersion <version>', 'Shopify API version to use', '2025-07')
  .option('-q, --quiet', 'Quiet output; only print final summary')
  .option('-v, --verbose', 'Verbose output; show fields being updated')
  .option('-d, --debug', 'Debug output; include GraphQL internals');

program.parse(process.argv);

const options = program.opts();

if (!options.metaobjects && !options.metafields) {
  console.error('Please specify --metafields and/or --metaobjects');
  process.exit(1);
}

// Determine log level (debug > verbose > quiet > normal)
let resolvedLevel = 'normal';
if (options.debug) resolvedLevel = 'debug';
else if (options.verbose) resolvedLevel = 'verbose';
else if (options.quiet) resolvedLevel = 'quiet';
initializeLogger(resolvedLevel);

(async () => {
  const spinner = new LoadingSpinner('Starting migration...');
  global.spinner = spinner; // Make spinner globally accessible
  spinner.start();

  try {
    const tasks = [];

    if (options.metaobjects) {
      spinner.updateMessage('Migrating metaobject definitions...');
      tasks.push(
        copyMetaobjectDefinitions(
          options.sourceStore,
          options.sourceToken,
          options.targetStore,
          options.targetToken,
          options.apiVersion || '2025-07'
        )
      );
    }

    if (options.metafields) {
      if (!options.shopifyObjectTypes) {
        throw new Error(
          '--shopifyObjectTypes is required. Use --help for more information.'
        );
      }
      spinner.updateMessage('Migrating metafield definitions...');
      tasks.push(
        copyMetafieldDefinitions(
          options.sourceStore,
          options.sourceToken,
          options.targetStore,
          options.targetToken,
          options.shopifyObjectTypes,
          options.apiVersion || '2025-07'
        )
      );
    }

    await Promise.all(tasks);
    spinner.updateMessage('Migration completed successfully!');
    setTimeout(() => {
      spinner.stop();
      printFinalSummary();
    }, 1000);
  } catch (err) {
    spinner.stop();
    recordError('Unhandled error during migration', err);
    printFinalSummary();
    process.exitCode = 1;
  }
})();
