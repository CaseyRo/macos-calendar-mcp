# Change: Add HTTP Server Transport

## Why

The current MCP server only supports stdio transport, which requires direct process communication and limits access to the local machine. To enable network access for the MCP server (both on local network and via Tailscale), we need to add HTTP/SSE (Server-Sent Events) transport support. This will allow remote clients to connect to the server over HTTP while maintaining the streaming capabilities required by the MCP protocol.

## What Changes

- Add HTTP/SSE transport capability using @modelcontextprotocol/sdk's StreamableHTTPServerTransport
- Implement configurable HTTP server with host/port configuration
- Support MCP protocol over HTTP with Server-Sent Events for streaming responses
- Add environment variables for HTTP server configuration (MCP_TRANSPORT, MCP_HTTP_HOST, MCP_HTTP_PORT)
- Add comprehensive testing for all 8 calendar tools (unit and integration tests)
- Improve error handling with clear, actionable error messages for all failure scenarios
- Set up Yarn package management with proper configuration
- Maintain backward compatibility with existing stdio mode
- Enable the server to run in dual-mode (stdio) or HTTP-only mode
- Add comprehensive documentation covering setup, configuration, usage, testing, and troubleshooting

## Impact

- Affected specs: New capability `http-transport`
- Affected code:
  - `macos-calendar-mcp-sdk.js` - Add HTTP transport support using StreamableHTTPServerTransport and server mode selection
  - `package.json` - Add Jest and testing dependencies, HTTP server dependency if needed, update scripts for Yarn
  - `yarn.lock` - Add to version control for Yarn package management
  - Test files - Add comprehensive unit and integration tests for all 8 calendar tools
  - `README.md` - Add HTTP mode setup, testing, error handling, and troubleshooting documentation
