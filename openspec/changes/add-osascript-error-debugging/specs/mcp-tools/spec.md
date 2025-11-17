## MODIFIED Requirements

### Requirement: Event Search Operations
The MCP server SHALL provide search functionality that enables searching calendar events across multiple calendars with proper error handling and debugging support. This requirement applies to both the `search-events` tool and the OpenAI-compatible `search` tool.

#### Scenario: Search with error handling for individual events
- **WHEN** the search operation processes events and encounters an error accessing a specific event
- **THEN** the error handler SHALL capture the error message and error number from AppleScript
- **AND** the error handler SHALL log error details including the event context (calendar name, operation type)
- **AND** the error handler SHALL continue processing remaining events without aborting the entire search
- **AND** error information SHALL be available for debugging purposes (logged to stderr or console.error)
- **AND** error information SHALL NOT be forwarded to MCP end users in tool responses
- **AND** when DEBUG mode is enabled, detailed error information SHALL be logged including event properties that were accessible before the error

#### Scenario: Error logging in search operations
- **WHEN** an AppleScript error occurs during event processing in search workflows (including both `search-events` and OpenAI `search` tools)
- **THEN** the error SHALL be logged with structured information including:
  - Error message from AppleScript
  - Error number/code from AppleScript (if available)
  - Calendar name where the error occurred
  - Operation type (search, fetch, etc.)
  - Context about which event or property access failed
- **AND** error logging SHALL not interrupt the overall operation flow
- **AND** error logging SHALL be visible in development mode and optionally in production mode via debug flags
- **AND** error details SHALL be logged to console/stderr only, not included in MCP tool response content

#### Scenario: Error isolation from MCP users
- **WHEN** an AppleScript error occurs during tool execution
- **THEN** the error details (error messages, error numbers, internal context) SHALL be logged to console.error or stderr
- **AND** the MCP tool response SHALL contain only user-friendly error messages without internal implementation details
- **AND** AppleScript error information SHALL NOT be forwarded to MCP clients in tool response content
- **AND** tool responses SHALL continue to indicate errors occurred (via isError flag or error messages) but without exposing internal debugging information

#### Scenario: Debug mode support
- **WHEN** DEBUG environment variable is set or debug mode is enabled
- **THEN** error handlers SHALL provide verbose logging including:
  - Full error details from AppleScript
  - Event properties that were successfully accessed before error
  - Stack trace or error context when available
  - Statistics about failed vs successful event processing
- **AND** debug information SHALL be output to stderr or console.error
- **AND** debug mode SHALL not affect the functional behavior of operations (only logging verbosity)
- **AND** debug information SHALL NOT be included in MCP tool responses regardless of debug mode setting

