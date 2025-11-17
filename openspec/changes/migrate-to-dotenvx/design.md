# Design: Migrate from dotenv to dotenvx

## Context

The project currently uses `dotenv` (v17.2.3) for loading environment variables from `.env` files. The implementation is simple: import `dotenv` and call `dotenv.config()` at startup. This works well but `dotenvx` offers enhanced security features and better cross-platform support while maintaining the same API.

## Goals / Non-Goals

### Goals
- Replace `dotenv` with `@dotenvx/dotenvx` as a drop-in replacement
- Maintain identical API and behavior (no breaking changes)
- Enable optional encryption support for `.env` files (future-ready)
- Improve security posture without changing user workflow
- Keep the same simple library-based approach (not CLI-based)

### Non-Goals
- Changing to CLI-based usage (staying with library mode)
- Requiring encryption (optional feature, not mandatory)
- Changing `.env` file format or structure
- Modifying configuration loading behavior or precedence

## Decisions

### Decision: Use Library Mode (Not CLI Mode)
**Rationale**: The current implementation uses `dotenv` as a library with `import dotenv from "dotenv"` and `dotenv.config()`. `dotenvx` supports the same library API, making it a true drop-in replacement. CLI mode would require changing how the application is started, which is unnecessary for this use case.

**Implementation**:
- Replace `import dotenv from "dotenv"` with `import dotenvx from "@dotenvx/dotenvx"`
- Replace `dotenv.config()` with `dotenvx.config()`
- No other code changes needed

### Decision: Keep Encryption Optional
**Rationale**: While `dotenvx` supports encryption, we're not requiring it in this migration. Users can optionally enable encryption later if needed. The migration focuses on the drop-in replacement benefit.

**Future consideration**: If encryption is desired, users can:
1. Generate keys: `dotenvx encrypt generate`
2. Encrypt `.env`: `dotenvx encrypt .env`
3. Commit `.env.encrypted` (safe) and keep `.env.keys` private

### Decision: Maintain Same Package Structure
**Rationale**: `dotenvx` works identically to `dotenv` for basic usage. The `.env` file format, loading order, and precedence remain unchanged. No migration needed for existing `.env` files.

## Risks / Trade-offs

### Risk: Package Size
**Mitigation**: `@dotenvx/dotenvx` is slightly larger than `dotenv`, but the difference is minimal and acceptable for the security benefits.

### Risk: Breaking Changes
**Mitigation**: `dotenvx` maintains API compatibility with `dotenv` for basic usage. The `config()` method works identically. Extensive testing will verify compatibility.

### Trade-off: Additional Features Not Used Initially
**Acceptable** because:
- Encryption can be enabled later if needed
- Multi-environment support is available but not required
- No downside to having these features available

## Migration Plan

### Phase 1: Dependency Update
1. Remove `dotenv` from `package.json`
2. Add `@dotenvx/dotenvx` to `package.json`
3. Run `yarn install` to update dependencies

### Phase 2: Code Update
1. Update import statement in `macos-calendar-mcp-sdk.js`
2. Update `dotenv.config()` to `dotenvx.config()`
3. Verify no other references to `dotenv` exist

### Phase 3: Documentation
1. Update README to mention `dotenvx` instead of `dotenv`
2. Optionally document encryption capabilities (as future enhancement)
3. Verify `.env.example` remains accurate

### Phase 4: Testing
1. Test with existing `.env` file (should work identically)
2. Test with environment variables (should still override `.env`)
3. Test without `.env` file (should use defaults)
4. Verify all configuration options work as before

### Rollback
- Revert import statement back to `dotenv`
- Revert `package.json` dependency
- Run `yarn install`
- No data migration needed (`.env` files work with both)

