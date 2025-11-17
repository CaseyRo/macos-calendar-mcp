# Change: Show Network Interfaces on HTTP Server Start

## Why
When the HTTP server starts, users need to know all the network interfaces and IP addresses where the server is accessible. Currently, the server only shows the configured host and port, but doesn't display the actual network interfaces (localhost, WiFi, Ethernet, Tailscale, etc.) that clients can use to connect. This makes it difficult for users to discover how to connect from different networks or devices.

## What Changes
- **MODIFIED**: HTTP server startup output now displays all available network interfaces and their IP addresses
- The server will enumerate all network interfaces on the local machine
- Display includes: localhost (127.0.0.1), WiFi IPs, Ethernet IPs, Tailscale IPs, and any other active network interfaces
- Each interface shows the full URL (e.g., `http://192.168.1.100:3000/mcp`) for easy copy-paste
- Interface names are shown alongside IPs for clarity (e.g., "Wi-Fi", "Ethernet", "Tailscale")

## Impact
- Affected specs: `http-transport` (modifies existing requirement)
- Affected code: `macos-calendar-mcp-sdk.js` - `runHTTP()` method
- User experience: Improved discoverability of server endpoints
- No breaking changes: Existing functionality remains unchanged, only startup output is enhanced

