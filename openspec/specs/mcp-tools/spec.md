## Purpose
The MCP tools capability provides calendar management functionality through the Model Context Protocol, enabling AI assistants to create, list, search, and manage calendar events on macOS.
## Requirements
### Requirement: Create Event Tool
The MCP server SHALL provide a `create-event` tool that enables users to create calendar events, including both timed events and all-day events.

#### Scenario: Create timed event (existing behavior)
- **WHEN** the `create-event` tool is called with `title`, `startDate`, and `endDate` parameters (and optionally `allDay: false` or `allDay` omitted)
- **THEN** the tool SHALL create a timed event in the specified calendar
- **AND** the event SHALL have the exact start and end times as specified in the `startDate` and `endDate` parameters
- **AND** the event SHALL be created with the `allday event` property set to `false` (or omitted) in AppleScript
- **AND** the tool SHALL return a JSON-encoded string in an MCP content array with `type: "text"`
- **AND** the JSON SHALL contain a `success` boolean field set to `true`
- **AND** the JSON SHALL include the created event details with properties: `title`, `startDate`, `endDate`, `description`, `location`, `calendar`, `allDay`
- **AND** the `allDay` property in the response SHALL be `false` for timed events

#### Scenario: Create all-day event
- **WHEN** the `create-event` tool is called with `title`, `startDate`, `endDate`, and `allDay: true` parameters
- **THEN** the tool SHALL create an all-day event in the specified calendar
- **AND** the event SHALL be created with the `allday event` property set to `true` in AppleScript
- **AND** the start date SHALL be interpreted as the beginning of the all-day period (12:00 AM on the start date)
- **AND** the end date SHALL be interpreted as the end of the all-day period (12:00 AM on the day after the end date, per Calendar app conventions)
- **AND** the tool SHALL return a JSON-encoded string in an MCP content array with `type: "text"`
- **AND** the JSON SHALL contain a `success` boolean field set to `true`
- **AND** the JSON SHALL include the created event details with properties: `title`, `startDate`, `endDate`, `description`, `location`, `calendar`, `allDay`
- **AND** the `allDay` property in the response SHALL be `true` for all-day events

#### Scenario: Create event returns success status and event details
- **WHEN** the `create-event` tool successfully creates an event
- **THEN** the tool SHALL return a JSON-encoded string in an MCP content array with `type: "text"`
- **AND** the JSON SHALL contain a `success` boolean field set to `true`
- **AND** the JSON SHALL include the created event details with properties: `title`, `startDate`, `endDate`, `description`, `location`, `calendar`, `allDay`
- **AND** the response format SHALL be: `{"success": true, "calendar": "...", "event": {..., "allDay": true|false}}`

#### Scenario: All-day event date interpretation
- **WHEN** an all-day event is created with `startDate: "2025-01-15 14:00"` and `endDate: "2025-01-17 16:00"` and `allDay: true`
- **THEN** the event SHALL span from 12:00 AM on January 15, 2025 to 12:00 AM on January 18, 2025 (day after end date)
- **AND** the event SHALL appear in the Calendar app as an all-day event covering January 15, 16, and 17
- **AND** the event SHALL not display specific times in the Calendar app

#### Scenario: Batch create events with all-day support
- **WHEN** the `create-batch-events` tool is called with an array of events where some have `allDay: true` and others have `allDay: false` or omit the property
- **THEN** the tool SHALL create each event according to its `allDay` setting
- **AND** events with `allDay: true` SHALL be created as all-day events with date adjustments applied
- **AND** events without `allDay: true` SHALL be created as timed events with exact times
- **AND** the tool SHALL return a JSON-encoded string with `successCount`, `failCount`, and `results` array
- **AND** each result in the `results` array SHALL indicate success/failure status and include the `allDay` property when applicable

