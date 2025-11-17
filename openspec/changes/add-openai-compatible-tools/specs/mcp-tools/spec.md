## ADDED Requirements

### Requirement: OpenAI-Compatible Search Tool
The MCP server SHALL provide a `search` tool that enables OpenAI ChatGPT connectors and deep research to search calendar events using a standardized interface.

#### Scenario: Search returns matching events
- **WHEN** the `search` tool is called with a query string
- **THEN** the tool SHALL search all calendar events for matches in title, description, or location
- **AND** the tool SHALL return a JSON-encoded string in an MCP content array with `type: "text"`
- **AND** the JSON SHALL contain a `results` array with objects having `id`, `title`, and `url` properties
- **AND** each result SHALL have a unique, stable identifier (`id`)
- **AND** each result SHALL have a human-readable title (`title`)
- **AND** each result SHALL have a canonical URL (`url`) for citation purposes

#### Scenario: Search with no matches
- **WHEN** the `search` tool is called with a query that matches no events
- **THEN** the tool SHALL return a JSON-encoded string with an empty `results` array: `{"results": []}`
- **AND** the response SHALL still be in an MCP content array with `type: "text"`

#### Scenario: Search with empty query
- **WHEN** the `search` tool is called with an empty or whitespace-only query string
- **THEN** the tool SHALL return a JSON-encoded string with an empty `results` array: `{"results": []}`

### Requirement: OpenAI-Compatible Fetch Tool
The MCP server SHALL provide a `fetch` tool that enables OpenAI ChatGPT connectors and deep research to retrieve complete event details by ID.

#### Scenario: Fetch returns full event details
- **WHEN** the `fetch` tool is called with a valid event ID
- **THEN** the tool SHALL retrieve the complete event details from the calendar
- **AND** the tool SHALL return a JSON-encoded string in an MCP content array with `type: "text"`
- **AND** the JSON SHALL contain an object with `id`, `title`, `text`, `url`, and optional `metadata` properties
- **AND** the `id` SHALL match the requested identifier
- **AND** the `title` SHALL be the event summary/title
- **AND** the `text` SHALL contain the full event description and details (formatted for readability)
- **AND** the `url` SHALL be a canonical URL for citation
- **AND** the `metadata` SHALL be an optional object containing additional event properties (start date, end date, location, calendar name, etc.)

#### Scenario: Fetch with invalid ID
- **WHEN** the `fetch` tool is called with an ID that does not exist
- **THEN** the tool SHALL return an error indicating the event was not found
- **AND** the error SHALL be returned in an MCP content array with `type: "text"` and `isError: true`

#### Scenario: Fetch includes comprehensive event information
- **WHEN** the `fetch` tool successfully retrieves an event
- **THEN** the `text` field SHALL include:
  - Event title/summary
  - Start date and time
  - End date and time
  - Location (if present)
  - Description (if present)
  - Calendar name
- **AND** the information SHALL be formatted in a human-readable way suitable for AI model consumption

### Requirement: Event ID Generation and Mapping
The MCP server SHALL generate stable, unique identifiers for calendar events that can be used with the `fetch` tool.

#### Scenario: Stable IDs across searches
- **WHEN** the same calendar event is returned by multiple `search` calls
- **THEN** the event SHALL have the same `id` value in all results
- **AND** the `id` SHALL be usable with the `fetch` tool to retrieve the event

#### Scenario: ID format consistency
- **WHEN** event IDs are generated
- **THEN** IDs SHALL follow a consistent format (e.g., `calendar-event-{unique-identifier}`)
- **AND** IDs SHALL be unique across all calendars and events
- **AND** IDs SHALL be stable (not change between server restarts if possible, or use a deterministic generation method)

### Requirement: MCP Content Array Format Compliance
All tool responses SHALL conform to OpenAI's MCP content array format requirements.

#### Scenario: Search tool response format
- **WHEN** the `search` tool returns results
- **THEN** the response SHALL be an object with a `content` array
- **AND** the `content` array SHALL contain exactly one item
- **AND** the content item SHALL have `type: "text"`
- **AND** the content item's `text` field SHALL be a JSON-encoded string matching the OpenAI search results schema

#### Scenario: Fetch tool response format
- **WHEN** the `fetch` tool returns event details
- **THEN** the response SHALL be an object with a `content` array
- **AND** the `content` array SHALL contain exactly one item
- **AND** the content item SHALL have `type: "text"`
- **AND** the content item's `text` field SHALL be a JSON-encoded string matching the OpenAI fetch document schema

