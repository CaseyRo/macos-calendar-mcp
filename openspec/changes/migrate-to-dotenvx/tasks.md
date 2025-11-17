## 1. Dependency Update
- [ ] 1.1 Remove `dotenv` from `package.json` dependencies
- [ ] 1.2 Add `@dotenvx/dotenvx` to `package.json` dependencies
- [ ] 1.3 Run `yarn install` to update dependencies
- [ ] 1.4 Verify `yarn.lock` is updated correctly

## 2. Code Migration
- [ ] 2.1 Update import statement in `macos-calendar-mcp-sdk.js` from `import dotenv from "dotenv"` to `import dotenvx from "@dotenvx/dotenvx"`
- [ ] 2.2 Update `dotenv.config()` call to `dotenvx.config()` in `macos-calendar-mcp-sdk.js`
- [ ] 2.3 Verify no other references to `dotenv` exist in the codebase

## 3. Documentation
- [ ] 3.1 Update README.md to reference `dotenvx` instead of `dotenv`
- [ ] 3.2 Optionally add note about encryption capabilities (as future enhancement)
- [ ] 3.3 Verify `.env.example` file remains accurate (no changes needed)

## 4. Testing & Validation
- [ ] 4.1 Test server startup with existing `.env` file (should work identically)
- [ ] 4.2 Test with environment variables set (should override `.env` as before)
- [ ] 4.3 Test without `.env` file (should use defaults)
- [ ] 4.4 Verify all configuration options (`MCP_TRANSPORT`, `MCP_HTTP_HOST`, `MCP_HTTP_PORT`) work correctly
- [ ] 4.5 Verify configuration precedence (env vars → .env → defaults) still works

