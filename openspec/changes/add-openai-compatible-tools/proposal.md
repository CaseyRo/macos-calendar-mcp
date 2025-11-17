# Change: Add OpenAI-Compatible Search and Fetch Tools

## Why
OpenAI's ChatGPT connectors and deep research features require MCP servers to implement two specific tools (`search` and `fetch`) that follow a standardized format. Currently, the server only provides calendar-specific tools (`search-events`, `list-calendars`, etc.) which are not compatible with OpenAI's connector requirements. Adding OpenAI-compatible tools will enable the server to work with ChatGPT connectors, deep research, and API integrations.

## What Changes
- **ADDED**: `search` tool that returns calendar events in OpenAI-compatible format (id, title, url)
- **ADDED**: `fetch` tool that retrieves full event details by ID in OpenAI-compatible format (id, title, text, url, metadata)
- Both tools return JSON-encoded strings in MCP content arrays with `type: "text"` as required by OpenAI specifications
- Tools map existing calendar event data to OpenAI's expected schema
- **NO CHANGES**: Existing `search-events` tool remains unchanged and continues to work as before
  - `search-events`: Calendar-specific tool with calendar parameter, human-readable output
  - `search`: OpenAI-compatible tool, standardized JSON format, searches across all calendars
- No breaking changes: all existing calendar-specific tools remain unchanged

## Design Rationale: Why Not Client-Side Filtering?
OpenAI's specification requires a `search` tool that performs server-side filtering. The client (ChatGPT) expects to call `search(query)` and receive filtered results. While OpenAI limits results to 50 events (preventing overburdening), returning all events for client-side filtering would still:
- Violate OpenAI's MCP server specification (requires `search` tool interface)
- Not match the expected interface pattern (ChatGPT calls `search(query)`, not `list-all-events()`)
- Require clients to implement filtering logic that should be server-side
- Be less efficient than server-side filtering (even with 50-result limit, we'd return irrelevant events)

## Future Consideration: Tool Consolidation
While both `search-events` and `search` exist, we may consider deprecating `search-events` in a future major version in favor of `search` with optional calendar filtering. This would be a breaking change and requires careful migration planning.

## Impact
- Affected specs: `mcp-tools` (new capability)
- Affected code: `macos-calendar-mcp-sdk.js` - new tool handlers for `search` and `fetch`
- User experience: Server can now be used with ChatGPT connectors and OpenAI deep research
- Compatibility: Maintains backward compatibility with existing calendar tools

