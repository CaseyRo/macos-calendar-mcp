## 1. Implementation
- [ ] 1.1 Add `search` tool definition to tool list handler
- [ ] 1.2 Implement `search` tool handler that:
  - Takes a query string parameter
  - Searches calendar events using existing AppleScript infrastructure
  - Returns results in OpenAI format: `{"results": [{"id": "...", "title": "...", "url": "..."}]}`
  - Encodes result as JSON string in MCP content array with `type: "text"`
- [ ] 1.3 Add `fetch` tool definition to tool list handler
- [ ] 1.4 Implement `fetch` tool handler that:
  - Takes an ID string parameter
  - Retrieves full event details by ID
  - Returns document in OpenAI format: `{"id": "...", "title": "...", "text": "...", "url": "...", "metadata": {...}}`
  - Encodes result as JSON string in MCP content array with `type: "text"`
- [ ] 1.5 Add ID generation/mapping logic to create stable IDs for calendar events
- [ ] 1.6 Add URL generation for calendar events (e.g., `calendar://event/{id}` or similar)

## 2. Testing
- [ ] 2.1 Test `search` tool with various query strings
- [ ] 2.2 Test `search` tool with empty results
- [ ] 2.3 Test `fetch` tool with valid event IDs
- [ ] 2.4 Test `fetch` tool with invalid/non-existent IDs
- [ ] 2.5 Verify JSON encoding in MCP content arrays
- [ ] 2.6 Verify response format matches OpenAI specifications exactly
- [ ] 2.7 Test integration with existing calendar tools (ensure no conflicts)

## 3. Documentation
- [ ] 3.1 Update README.md to document OpenAI compatibility
- [ ] 3.2 Add examples of using `search` and `fetch` tools
- [ ] 3.3 Document the ID format and URL scheme used
- [ ] 3.4 Add note about ChatGPT connector compatibility

