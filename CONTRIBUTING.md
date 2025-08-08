# Contributing to Shopify Metafields Copy Tool

Thank you for your interest in contributing to the Shopify Metafields Copy Tool! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Code Style Guidelines](#code-style-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Enhancements](#suggesting-enhancements)

## Code of Conduct

By participating in this project, you are expected to uphold a respectful and inclusive environment. Please be kind and considerate in your interactions with other contributors.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues to see if the problem has already been reported. When creating a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include details about your configuration and environment**

### Suggesting Enhancements

If you have a suggestion for a new feature or improvement:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the use case**
- **Describe the current behavior and explain which behavior you expected to see instead**

## Development Setup

1. **Fork the repository**
   ```bash
   # Clone your fork
   git clone https://github.com/YOUR_USERNAME/copy-shopify-metafields.git
   cd copy-shopify-metafields
   ```

2. **Ensure you have the prerequisites**
   - Node.js 18+ installed
   - Access to Shopify stores for testing

3. **Set up your development environment**
   ```bash
   # No additional dependencies required
   # The project uses native Node.js fetch
   ```

4. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

## Pull Request Process

1. **Fork the repository**
   - Click the "Fork" button on the main repository page
   - This creates a copy of the repository under your GitHub account

2. **Create a feature branch**
   - Always create a new branch for your changes
   - Use descriptive branch names (e.g., `feature/add-validation`, `fix/metafield-copy-issue`)

3. **Make your changes**
   - Write clear, readable code
   - Follow the existing code style
   - Add comments where necessary
   - Test your changes thoroughly

4. **Test your changes**
   - Test with both source and target Shopify stores
   - Verify that the tool works as expected
   - Check for any error conditions

5. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new validation for metafield types"
   # Use conventional commit messages
   ```

6. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Select the `master` branch as the target
   - Fill out the pull request template (if available)
   - Provide a clear description of your changes

8. **Wait for review**
   - Maintainers will review your pull request
   - Address any feedback or requested changes
   - Once approved, your changes will be merged

## Code Style Guidelines

### JavaScript Style

- Use meaningful variable and function names
- Add comments for complex logic
- Follow the existing code structure and patterns
- Use consistent indentation (2 spaces)
- Use semicolons at the end of statements

### Commit Messages

Use conventional commit messages:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding or updating tests
- `chore:` for maintenance tasks

Example:
```
feat: add validation for metaobject reference types
fix: handle GraphQL errors more gracefully
docs: update README with new examples
```

### Pull Request Description

When creating a pull request, include:

- **Summary**: Brief description of the changes
- **Motivation**: Why this change is needed
- **Changes**: Detailed list of what was changed
- **Testing**: How you tested the changes
- **Screenshots**: If applicable, include screenshots or examples

## Reporting Bugs

When reporting bugs, please include:

1. **Environment details**:
   - Node.js version
   - Operating system
   - Shopify store types (development/production)

2. **Steps to reproduce**:
   - Exact command used
   - Expected behavior
   - Actual behavior

3. **Error messages**:
   - Full error output
   - Any relevant logs

4. **Additional context**:
   - Any relevant configuration
   - Steps you've already tried

## Suggesting Enhancements

When suggesting enhancements:

1. **Describe the problem**:
   - What limitation or issue are you addressing?
   - How does it affect users?

2. **Propose a solution**:
   - How should the tool behave?
   - What new features would help?

3. **Consider alternatives**:
   - Are there other ways to solve this?
   - What are the trade-offs?

## Getting Help

If you need help with your contribution:

- Check existing issues and pull requests
- Ask questions in the issue comments
- Be patient and respectful

## License

By contributing to this project, you agree that your contributions will be licensed under the same terms as the project itself.

Thank you for contributing to the Shopify Metafields Copy Tool!
