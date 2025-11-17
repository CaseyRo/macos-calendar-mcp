## MODIFIED Requirements

### Requirement: Tool Response Format
The MCP server SHALL return structured JSON objects in all tool responses to enable programmatic consumption and improve interoperability.

#### Scenario: List calendars returns JSON array
- **WHEN** the `list-calendars` tool is called
- **THEN** the tool SHALL return a JSON-encoded string in an MCP content array with `type: "text"`
- **AND** the JSON SHALL contain a `calendars` array with calendar name strings: `{"calendars": ["Calendar1", "Calendar2", ...]}`
- **AND** the response SHALL be valid JSON that can be parsed by clients

#### Scenario: List events returns JSON array of event objects
- **WHEN** the `list-today-events`, `list-week-events`, or `search-events` tool is called
- **THEN** the tool SHALL return a JSON-encoded string in an MCP content array with `type: "text"`
- **AND** the JSON SHALL contain an `events` array with structured event objects
- **AND** each event object SHALL have the following properties: `title` (string), `startDate` (string), `endDate` (string), `description` (string, optional), `location` (string, optional)
- **AND** the JSON SHALL include metadata such as `calendar` name and query parameters where applicable
- **AND** empty results SHALL return an empty `events` array: `{"events": [], ...}`

#### Scenario: Create event returns success status and event details
- **WHEN** the `create-event` tool successfully creates an event
- **THEN** the tool SHALL return a JSON-encoded string in an MCP content array with `type: "text"`
- **AND** the JSON SHALL contain a `success` boolean field set to `true`
- **AND** the JSON SHALL include the created event details with properties: `title`, `startDate`, `endDate`, `description`, `location`, `calendar`
- **AND** the response format SHALL be: `{"success": true, "calendar": "...", "event": {...}}`

#### Scenario: Batch operations return detailed results
- **WHEN** the `create-batch-events` or `fix-event-times` tool is called
- **THEN** the tool SHALL return a JSON-encoded string in an MCP content array with `type: "text"`
- **AND** the JSON SHALL contain `successCount` and `failCount` numeric fields
- **AND** the JSON SHALL contain a `results` array with detailed operation results
- **AND** each result in the `results` array SHALL indicate success/failure status and include relevant details or error information

#### Scenario: Delete operation returns deletion count
- **WHEN** the `delete-events-by-keyword` tool successfully deletes events
- **THEN** the tool SHALL return a JSON-encoded string in an MCP content array with `type: "text"`
- **AND** the JSON SHALL contain a `deletedCount` numeric field indicating the number of deleted events
- **AND** the JSON SHALL include metadata: `keyword`, `calendar`

#### Scenario: All responses use JSON-encoded strings
- **WHEN** any tool returns a successful response
- **THEN** the response SHALL be an object with a `content` array
- **AND** the `content` array SHALL contain exactly one item
- **AND** the content item SHALL have `type: "text"`
- **AND** the content item's `text` field SHALL be a JSON-encoded string (not plain text)
- **AND** the JSON string SHALL be parseable and contain structured data (objects/arrays)

#### Scenario: Error responses use JSON format
- **WHEN** any tool encounters an error
- **THEN** the response SHALL have `isError: true`
- **AND** the response SHALL contain a `content` array with `type: "text"`
- **AND** the `text` field SHALL be a JSON-encoded string containing an error object: `{"error": "error message", ...}`
- **AND** the error JSON SHALL include relevant error details for programmatic handling

