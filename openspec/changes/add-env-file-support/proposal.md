# Change: Add .env File Support for Configuration

## Why

Currently, users must set environment variables directly in the command line, which can be cumbersome and error-prone. Adding `.env` file support will make configuration more convenient and maintainable. Users can store their configuration in a `.env` file, which is easier to manage, version control (with `.env.example`), and share across different environments.

## What Changes

- Add `dotenv` package to load environment variables from `.env` file
- Create `.env.example` file with all available configuration options and documentation
- Load `.env` file at server startup (before reading environment variables)
- Update documentation to explain `.env` file usage and `.env.example` setup
- Ensure `.env` file is in `.gitignore` to prevent committing sensitive configuration
- Maintain backward compatibility with direct environment variable usage

## Impact

- Affected specs: New capability `configuration` (or modify existing if configuration spec exists)
- Affected code:
  - `macos-calendar-mcp-sdk.js` - Add dotenv loading at startup
  - `package.json` - Add `dotenv` dependency
  - `.gitignore` - Ensure `.env` is excluded
  - `.env.example` - New file with configuration template
  - `README.md` - Add `.env` file documentation

