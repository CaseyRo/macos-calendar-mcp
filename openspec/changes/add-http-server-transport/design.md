# Design: HTTP Server Transport

## Context
The macOS Calendar MCP server currently uses `StdioServerTransport` from the MCP SDK, which communicates over standard input/output. This limits the server to local process-to-process communication. To enable network access, we need to implement HTTP/SSE transport that supports the MCP protocol's streaming requirements.

## Goals / Non-Goals

### Goals
- Enable HTTP/SSE transport for network accessibility
- Support both stdio and HTTP modes (backward compatibility)
- Configurable host/port for HTTP server
- Streaming support via Server-Sent Events (SSE)
- Works with local network and Tailscale
- Maintain all existing calendar tools functionality

### Non-Goals
- Authentication/authorization (initial version - may be added later)
- HTTPS/TLS support (initial version - rely on Tailscale encryption)
- Multiple concurrent HTTP clients (initial version - focus on single client)
- WebSocket transport (use SSE instead)

## Decisions

### Decision: Use HTTP/SSE for Transport
**Rationale**: The MCP protocol supports streaming responses via Server-Sent Events. SSE is simpler than WebSockets for unidirectional streaming from server to client, and works well with standard HTTP infrastructure. HTTP/SSE is widely supported and easier to debug.

**Alternatives considered**:
- WebSockets: More complex, requires persistent connection management
- Plain HTTP polling: Less efficient, doesn't support true streaming
- gRPC: Overkill for this use case, adds complexity

### Decision: Dual Transport Support
**Rationale**: Maintain backward compatibility with existing stdio-based clients while adding HTTP capability. Allow users to choose the transport mode via configuration.

**Implementation approach**:
- Add command-line flag or environment variable to select transport mode
- Default to stdio mode for backward compatibility
- When HTTP mode is enabled, start HTTP server instead of/stdio transport

### Decision: Configuration via Environment Variables
**Rationale**: Simple, standard approach for server configuration. Allows easy deployment without modifying code.

**Configuration options**:
- `MCP_TRANSPORT` - "stdio" or "http" (default: "stdio")
- `MCP_HTTP_HOST` - Host to bind (default: "0.0.0.0" for network access)
- `MCP_HTTP_PORT` - Port number (default: 3000)

### Decision: HTTP Endpoint Structure
**Rationale**: Follow MCP protocol specifications for HTTP transport.

**Endpoints**:
- `POST /mcp` - Main MCP protocol endpoint (JSON-RPC messages)
- `GET /mcp/sse` - Server-Sent Events stream for server-to-client messages
- `GET /health` - Health check endpoint (optional)

### Decision: Use MCP SDK's StreamableHTTPServerTransport
**Rationale**: Use the standard MCP SDK implementation for HTTP/SSE transport to ensure protocol compliance and maintainability. The SDK provides `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js` which handles the HTTP/SSE protocol details.

**Implementation strategy**:
1. Use `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js`
2. Integrate with Express or Node.js built-in HTTP server for the HTTP server infrastructure
3. Connect MCP Server instance to StreamableHTTPServerTransport similar to StdioServerTransport

## Risks / Trade-offs

### Risk: MCP SDK HTTP Transport Availability
**Mitigation**: Use `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js`. If not available in current SDK version, upgrade SDK or implement wrapper following SDK patterns.

### Risk: Network Security
**Mitigation**: Document that initial version relies on Tailscale for encryption. Future versions can add authentication tokens or OAuth.

### Risk: Complexity from Dual Transport Support
**Mitigation**: Keep transport selection simple (single flag/env var). Ensure clean separation between transport layer and business logic.

### Trade-off: No Authentication in Initial Version
**Acceptable** because:
- Primary use case is local network or Tailscale (encrypted mesh VPN)
- Can be added in follow-up change if needed
- Simpler initial implementation

## Migration Plan

### Phase 1: Implementation
1. Add HTTP transport support
2. Add configuration options
3. Test both stdio and HTTP modes
4. Document new configuration options

### Phase 2: Testing
1. Test HTTP mode on local network
2. Test via Tailscale
3. Verify backward compatibility with stdio mode
4. Test all calendar tools over HTTP transport

### Phase 3: Documentation
1. Update README with HTTP mode instructions
2. Document Tailscale setup if needed
3. Add examples for HTTP client connections

### Rollback
- Default behavior remains stdio (backward compatible)
- If issues arise, users can continue using stdio mode
- No breaking changes to existing functionality

## Testing Strategy

### Unit Tests
- Test each calendar tool individually with mock AppleScript execution
- Test error handling for invalid inputs, missing calendars, date format errors
- Test transport selection logic (stdio vs HTTP)
- Test configuration parsing (environment variables)

### Integration Tests
- Test each tool over HTTP transport with actual Calendar app interaction
- Test error scenarios: missing permissions, invalid calendar names, date parsing failures
- Test SSE streaming functionality
- Test concurrent requests handling

### Test Framework
- Use Jest for unit and integration tests
- Mock `execSync` and `osascript` for unit tests
- Use actual Calendar app for integration tests (macOS only)
- Test both stdio and HTTP transports

## Error Handling

### Requirements
- All tools MUST provide clear, actionable error messages
- Error messages MUST include context about what failed and why
- Error messages MUST suggest possible solutions when applicable
- Errors MUST be properly formatted for MCP protocol responses

### Error Categories
1. **Validation Errors**: Invalid input formats, missing required fields
2. **AppleScript Errors**: Calendar app failures, permission issues
3. **Calendar Errors**: Calendar not found, event conflicts
4. **Date/Time Errors**: Invalid date formats, timezone issues
5. **Network Errors**: HTTP transport connection issues

### Error Message Format
- Include emoji indicators (❌ for errors, ⚠️ for warnings)
- Include context: which tool failed, what input was provided
- Include actionable guidance: what to check or how to fix

## Package Management

### Yarn Setup
- Use Yarn as the package manager
- Add yarn.lock to version control
- Configure package.json scripts for Yarn commands
- Ensure all dependencies can be installed with `yarn install`
- Document Yarn installation in README

## Documentation

### Required Documentation
1. **Setup Guide**: Step-by-step installation with Yarn
2. **HTTP Mode Configuration**: How to enable and configure HTTP transport
3. **Tool Documentation**: Description, parameters, examples, and error cases for each tool
4. **Testing Guide**: How to run tests, test coverage expectations
5. **Troubleshooting**: Common errors and solutions
6. **Tailscale Setup**: Optional guide for Tailscale integration

### Documentation Format
- Clear examples for each tool with success and error cases
- Code snippets for common use cases
- Error message reference guide
- Network configuration examples

