# Design: .env File Support

## Context
The server currently uses environment variables directly (`MCP_TRANSPORT`, `MCP_HTTP_HOST`, `MCP_HTTP_PORT`). Users must set these variables in their shell or command line, which can be inconvenient for repeated use or sharing configurations.

## Goals / Non-Goals

### Goals
- Enable configuration via `.env` file
- Provide `.env.example` template with all options documented
- Maintain backward compatibility with direct environment variable usage
- Ensure `.env` file is not committed to version control
- Make configuration easier to manage and share

### Non-Goals
- Multiple `.env` files for different environments (single `.env` file is sufficient)
- Configuration file validation on startup (keep it simple)
- Encrypted `.env` files (out of scope)
- Environment variable precedence over .env (environment variables should override .env for flexibility)

## Decisions

### Decision: Use `dotenv` Package
**Rationale**: `dotenv` is the standard, widely-used Node.js library for loading environment variables from `.env` files. It's simple, reliable, and well-maintained.

**Alternatives considered**:
- Custom `.env` parser: Unnecessary complexity, reinventing the wheel
- `dotenv-expand`: Adds complexity for variable expansion that we don't need
- Other env loaders: Less standard and widely adopted

### Decision: Environment Variables Override .env
**Rationale**: Environment variables should take precedence over `.env` file values. This allows users to override `.env` settings when needed (e.g., different port for testing).

**Precedence order**:
1. Environment variables (highest priority)
2. `.env` file values
3. Default values (lowest priority)

### Decision: Load .env Early in Startup
**Rationale**: Load `.env` file at the very beginning of the server script, before any configuration is read. This ensures `.env` values are available when needed.

**Implementation**:
- Import and configure `dotenv` at the top of `macos-calendar-mcp-sdk.js`
- Use `dotenv.config()` with default options
- No path configuration needed (defaults to `.env` in project root)

### Decision: .env.example Structure
**Rationale**: Provide a clear template with:
- All available configuration options
- Comments explaining each option
- Example values showing format
- Default values indicated

**Format**:
```
# MCP Server Configuration
# Copy this file to .env and customize as needed

# Transport mode: 'stdio' (default) or 'http'
MCP_TRANSPORT=stdio

# HTTP server configuration (only used when MCP_TRANSPORT=http)
MCP_HTTP_HOST=0.0.0.0
MCP_HTTP_PORT=3000
```

## Risks / Trade-offs

### Risk: .env File Conflicts
**Mitigation**: Document that environment variables take precedence. Users can override `.env` values when needed.

### Risk: Users Committing .env File
**Mitigation**:
- Ensure `.env` is in `.gitignore`
- Document in README not to commit `.env`
- `.env.example` is safe to commit

### Trade-off: Additional Dependency
**Acceptable** because:
- `dotenv` is lightweight and widely used
- Improves developer experience significantly
- Standard practice in Node.js projects

## Migration Plan

### Phase 1: Implementation
1. Install `dotenv` package
2. Add `.env` loading to server startup
3. Create `.env.example` file
4. Update `.gitignore` if needed

### Phase 2: Documentation
1. Update README with `.env` file setup instructions
2. Document precedence (env vars override .env)
3. Add examples showing both approaches

### Phase 3: Testing
1. Test with `.env` file
2. Test with environment variables (should override .env)
3. Test without either (should use defaults)
4. Verify `.env` is not committed

### Rollback
- Remove `dotenv` import and call
- Remove `.env.example` file
- Keep environment variable support (backward compatible)
- No breaking changes

