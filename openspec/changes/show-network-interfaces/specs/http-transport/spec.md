## MODIFIED Requirements

### Requirement: HTTP Transport Support
The system SHALL support HTTP/SSE transport for MCP protocol communication in addition to the existing stdio transport.

#### Scenario: Server starts in HTTP mode
- **WHEN** the server is started with `MCP_TRANSPORT=http` environment variable
- **THEN** the server starts an HTTP server listening on the configured host and port
- **AND** the server accepts MCP protocol requests over HTTP
- **AND** the server provides streaming responses via Server-Sent Events (SSE)

#### Scenario: Server starts in stdio mode (default)
- **WHEN** the server is started without `MCP_TRANSPORT` or with `MCP_TRANSPORT=stdio`
- **THEN** the server uses stdio transport as before
- **AND** backward compatibility is maintained

#### Scenario: Configurable HTTP server address
- **WHEN** the server is started in HTTP mode with `MCP_HTTP_HOST` and `MCP_HTTP_PORT` environment variables
- **THEN** the server binds to the specified host and port
- **WHEN** no host is specified
- **THEN** the server defaults to `0.0.0.0` (all network interfaces)
- **WHEN** no port is specified
- **THEN** the server defaults to port `3000`

#### Scenario: MCP protocol over HTTP
- **WHEN** a client sends a JSON-RPC MCP request via POST to the HTTP endpoint
- **THEN** the server processes the request using the existing MCP server handlers
- **AND** the server returns JSON-RPC responses over HTTP
- **AND** the server streams server-to-client messages via SSE

#### Scenario: All calendar tools work over HTTP
- **WHEN** a client connects via HTTP transport
- **THEN** all existing calendar tools (list-calendars, create-event, search-events, etc.) function identically to stdio mode
- **AND** tool execution results are returned via HTTP/SSE

#### Scenario: Network accessibility
- **WHEN** the server is running in HTTP mode on `0.0.0.0`
- **THEN** clients on the local network can connect using the server's IP address and port
- **AND** clients on Tailscale network can connect using the Tailscale domain/IP and port
- **AND** the server handles requests from remote clients

#### Scenario: Display network interfaces on startup
- **WHEN** the HTTP server successfully starts and begins listening
- **THEN** the server displays all available network interfaces and their IP addresses
- **AND** the output includes localhost (127.0.0.1) with full URL
- **AND** the output includes WiFi interface IPs with full URLs
- **AND** the output includes Ethernet interface IPs with full URLs
- **AND** the output includes Tailscale interface IPs with full URLs (if Tailscale is active)
- **AND** the output includes any other active network interfaces with full URLs
- **AND** each interface shows the complete endpoint URL (e.g., `http://192.168.1.100:3000/mcp`)
- **AND** interface names or types are displayed alongside IPs for clarity

