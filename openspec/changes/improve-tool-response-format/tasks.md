## 1. Implementation
- [x] 1.1 Update `listCalendars()` to return JSON object with `calendars` array
- [x] 1.2 Update `listTodayEvents()` to return JSON object with `events` array containing structured event objects
- [x] 1.3 Update `listWeekEvents()` to return JSON object with `events` array containing structured event objects
- [x] 1.4 Update `searchEvents()` to return JSON object with `events` array containing structured event objects
- [x] 1.5 Update `createEvent()` to return JSON object with success status and event details
- [x] 1.6 Update `createBatchEvents()` to return JSON object with success/fail counts and detailed results array
- [x] 1.7 Update `deleteEventsByKeyword()` to return JSON object with deletion count and metadata
- [x] 1.8 Update `fixEventTimes()` to return JSON object with fix counts and detailed results array
- [x] 1.9 Ensure all JSON responses are properly stringified in MCP content arrays (maintain `type: "text"`)
- [x] 1.10 Add consistent error response format (JSON object with `error` field) while maintaining `isError: true` flag

## 2. Testing
- [ ] 2.1 Test `list-calendars` returns valid JSON with calendars array
- [ ] 2.2 Test `list-today-events` returns valid JSON with events array (empty and populated cases)
- [ ] 2.3 Test `list-week-events` returns valid JSON with events array (empty and populated cases)
- [ ] 2.4 Test `search-events` returns valid JSON with events array (no matches case)
- [ ] 2.5 Test `create-event` returns valid JSON with success status and event details
- [ ] 2.6 Test `create-batch-events` returns valid JSON with counts and detailed results
- [ ] 2.7 Test `delete-events-by-keyword` returns valid JSON with deletion count
- [ ] 2.8 Test `fix-event-times` returns valid JSON with fix counts and detailed results
- [ ] 2.9 Verify all responses are valid JSON strings in MCP content arrays
- [ ] 2.10 Test error responses return JSON format with `isError: true` flag

## 3. Documentation
- [ ] 3.1 Update README.md with new JSON response format examples
- [ ] 3.2 Document the structure of each tool's JSON response
- [ ] 3.3 Add note about JSON parsing requirements for clients
- [ ] 3.4 Update examples in README to show JSON structure instead of text output

