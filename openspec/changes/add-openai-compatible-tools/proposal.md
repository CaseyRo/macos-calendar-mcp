# Change: Add OpenAI-Compatible Search and Fetch Tools

## Why
OpenAI's ChatGPT connectors and deep research features require MCP servers to implement two specific tools (`search` and `fetch`) that follow a standardized format. Currently, the server only provides calendar-specific tools (`search-events`, `list-calendars`, etc.) which are not compatible with OpenAI's connector requirements. Adding OpenAI-compatible tools will enable the server to work with ChatGPT connectors, deep research, and API integrations.

## What Changes
- **ADDED**: `search` tool that returns calendar events in OpenAI-compatible format (id, title, url)
- **ADDED**: `fetch` tool that retrieves full event details by ID in OpenAI-compatible format (id, title, text, url, metadata)
- Both tools return JSON-encoded strings in MCP content arrays with `type: "text"` as required by OpenAI specifications
- Tools map existing calendar event data to OpenAI's expected schema
- No breaking changes: existing calendar-specific tools remain unchanged

## Impact
- Affected specs: `mcp-tools` (new capability)
- Affected code: `macos-calendar-mcp-sdk.js` - new tool handlers for `search` and `fetch`
- User experience: Server can now be used with ChatGPT connectors and OpenAI deep research
- Compatibility: Maintains backward compatibility with existing calendar tools

