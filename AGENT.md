# Shopify Metadata Migrator

A CLI tool for copying Shopify Metafield and Metaobject definitions from one Shopify store to another—ideal for transferring configurations from development stores to production ([github.com](https://github.com/WarriorAchilles/shopify-metadata-migrator)).

## Project structure and organization

- **Root files and directories**:
  - `migrateShopifyMetafields.js`: Main script
  - `package.json`, `package-lock.json`: Dependencies and scripts
  - `.eslintrc.js`, `.prettierrc`, `.prettierignore`: Linting and formatting configs ([github.com](https://github.com/WarriorAchilles/shopify-metadata-migrator))
  - `README.md`, `CONTRIBUTING.md`, `LICENSE`: Documentation and contribution guidelines
- No sub-module hierarchy—simple, single-purpose structure.

## Build, test, and development commands

- **Install dependencies**:  
  ```bash
  npm install
  ```
- **Link locally for testing**:  
  ```bash
  npm link
  ```
- **Linting**:
  ```bash
  npm run lint        # Check lint issues
  npm run lint:fix    # Auto-fix lint issues
  ```
- **Formatting**:
  ```bash
  npm run format             # Apply Prettier formatting
  npm run format:check       # Check formatting compliance
  ```
- **Help command (after installing or linking)**:
  ```bash
  shopify-metadata-migrator --help
  ```
- **Publishing**: Automated on GitHub release or manually via GitHub Actions ([github.com](https://github.com/WarriorAchilles/shopify-metadata-migrator)).

## Code style and conventions

- **Linting via ESLint**: catch code issues early.
- **Formatting via Prettier**: consistent style across files.
- Use recommended settings in `.eslintrc.js` and `.prettierrc`.
- Maintain a clean, modular, and readable script.

## Architecture and design patterns

- **Pattern**: Sequential CLI workflow—`source → transform → validate → target` ([github.com](https://github.com/WarriorAchilles/shopify-metadata-migrator)).
  1. Fetch definitions from source store (GraphQL).
  2. Transform: strip internal IDs, flatten structures.
  3. Validate: skip unsupported reference types.
  4. Create definitions in the target store.
  5. Provide robust error handling and logging.
- **Error handling**:
  - Logs GraphQL errors and user errors with detail.
  - Includes original variables for debugging ([github.com](https://github.com/WarriorAchilles/shopify-metadata-migrator)).

## Testing guidelines

- No formal testing suite is included currently.
- Recommended:
  - Validate locally using `npm link` and test across dev-to-prod stores.
  - Exercise scenarios with metafields, metaobjects, and `--apiVersion` overrides ([github.com](https://github.com/WarriorAchilles/shopify-metadata-migrator)).
  - Manual checks for logs during failure scenarios.

## Security considerations

- **Access token security**: Use environment variables—not hard-coded—especially in production ([github.com](https://github.com/WarriorAchilles/shopify-metadata-migrator)).
- **Token privileges**:
  - Source store token: read access only.
  - Target store token: write access only.
- Use private apps with minimal scopes; avoid committing tokens to version control.
- Be aware of Shopify API versioning and deprecations.

## Configuration

- `--apiVersion` flag overrides default API version (2025‑07) ([github.com](https://github.com/WarriorAchilles/shopify-metadata-migrator)).
- Use environment variables to pass tokens:
  ```bash
  export SOURCE_TOKEN=…
  export TARGET_TOKEN=…
  ```
- Update `.env.example`, README, or config schemas whenever new parameters are introduced.

## Summary

This `AGENT.md` unifies essential project knowledge—structure, tooling, standards, CLI commands, architecture, security, and best practices—into one clear, agent-readable document, helping AI coding tools understand and interact with the codebase effectively ([ampcode.com](https://ampcode.com/agent.md?utm_source=chatgpt.com), [github.com](https://github.com/WarriorAchilles/shopify-metadata-migrator)).
