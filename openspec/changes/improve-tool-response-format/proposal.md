# Change: Improve Tool Response Formats to Structured JSON

## Why
Currently, all calendar tools return human-readable text strings with emojis and formatted messages. While readable for humans, these text responses are difficult to parse programmatically. This limits integration with other tools, makes automated processing harder, and doesn't align with modern API best practices. Converting responses to structured JSON objects/arrays will:

- Enable easier programmatic consumption of tool results
- Align with OpenAI compatibility patterns (JSON-encoded strings in MCP content arrays)
- Allow clients to format responses as needed (structured data or human-readable)
- Improve interoperability with other MCP tools and systems
- Make it easier to filter, transform, and process calendar data

## What Changes
- **MODIFIED**: All calendar tools now return JSON-encoded strings containing structured data instead of human-readable text
- **NO CHANGES**: MCP protocol compliance maintained - responses still use `content` arrays with `type: "text"`, but the `text` field contains JSON strings
- **NO BREAKING CHANGES**: The response structure format (MCP content array) remains the same, only the content format changes from plain text to JSON strings

### Tool Response Format Changes:

1. **`list-calendars`**: Returns `{"calendars": ["Calendar1", "Calendar2", ...]}` instead of formatted text
2. **`list-today-events`**: Returns `{"calendar": "...", "events": [{title, startDate, endDate, description, location}, ...]}` instead of formatted text
3. **`list-week-events`**: Returns `{"calendar": "...", "weekStart": "...", "events": [{title, startDate, endDate, location}, ...]}` instead of formatted text
4. **`search-events`**: Returns `{"calendar": "...", "query": "...", "events": [{title, startDate, endDate, description, location}, ...]}` instead of formatted text
5. **`create-event`**: Returns `{"success": true, "calendar": "...", "event": {title, startDate, endDate, description, location}}` instead of formatted text
6. **`create-batch-events`**: Returns `{"successCount": N, "failCount": M, "results": [{success, title, error?}, ...]}` instead of formatted text
7. **`delete-events-by-keyword`**: Returns `{"deletedCount": N, "keyword": "...", "calendar": "..."}` instead of formatted text
8. **`fix-event-times`**: Returns `{"successCount": N, "failCount": M, "results": [{keyword, fixedCount, error?}, ...]}` instead of formatted text

All JSON responses are encoded as strings in MCP content arrays with `type: "text"` for protocol compliance.

## Impact
- **Affected specs**: `mcp-tools` (response format requirements)
- **Affected code**: `macos-calendar-mcp-sdk.js` - all tool handler methods need response format updates
- **User experience**:
  - Better for programmatic consumption
  - Maintains backward compatibility at protocol level (MCP content arrays unchanged)
  - Clients can parse JSON and format as needed
- **OpenAI compatibility**: Aligns with OpenAI's pattern of JSON-encoded strings in content arrays
- **Migration**: No breaking changes to MCP protocol, but clients expecting formatted text strings will need to parse JSON instead

