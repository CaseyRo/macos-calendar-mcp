## 1. Dependency Update
- [x] 1.1 Remove `dotenv` from `package.json` dependencies
- [x] 1.2 Add `@dotenvx/dotenvx` to `package.json` dependencies
- [x] 1.3 Run `yarn install` to update dependencies
- [x] 1.4 Verify `yarn.lock` is updated correctly

## 2. Code Migration
- [x] 2.1 Update import statement in `macos-calendar-mcp-sdk.js` from `import dotenv from "dotenv"` to `import dotenvx from "@dotenvx/dotenvx"`
- [x] 2.2 Update `dotenv.config()` call to `dotenvx.config()` in `macos-calendar-mcp-sdk.js`
- [x] 2.3 Verify no other references to `dotenv` exist in the codebase

## 3. Documentation
- [x] 3.1 Update README.md to reference `dotenvx` instead of `dotenv`
- [x] 3.2 Optionally add note about encryption capabilities (as future enhancement)
- [x] 3.3 Verify `.env.example` file remains accurate (no changes needed)

## 4. Testing & Validation
- [x] 4.1 Test server startup with existing `.env` file (should work identically)
- [x] 4.2 Test with environment variables set (should override `.env` as before)
- [x] 4.3 Test without `.env` file (should use defaults)
- [x] 4.4 Verify all configuration options (`MCP_TRANSPORT`, `MCP_HTTP_HOST`, `MCP_HTTP_PORT`) work correctly
- [x] 4.5 Verify configuration precedence (env vars → .env → defaults) still works

