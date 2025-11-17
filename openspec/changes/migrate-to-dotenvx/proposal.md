# Change: Migrate from dotenv to dotenvx

## Why

The current implementation uses `dotenv` for loading environment variables from `.env` files. Migrating to `dotenvx` provides enhanced security features (including optional encryption support), better cross-platform consistency, improved multi-environment handling, and maintains the same simple library-based API. This is a drop-in replacement that improves security posture without changing the user experience.

## What Changes

- Replace `dotenv` package with `@dotenvx/dotenvx` in dependencies
- Update import statement in `macos-calendar-mcp-sdk.js` from `dotenv` to `@dotenvx/dotenvx`
- Update documentation to mention `dotenvx` and optional encryption capabilities
- Maintain backward compatibility - same API, same behavior, no breaking changes
- No changes to `.env` file format or usage patterns

## Impact

- Affected specs: `configuration` capability (MODIFIED)
- Affected code:
  - `macos-calendar-mcp-sdk.js` - Update import statement
  - `package.json` - Replace `dotenv` with `@dotenvx/dotenvx` dependency
  - `README.md` - Update documentation to reference dotenvx
  - `.env.example` - No changes needed (same format)

