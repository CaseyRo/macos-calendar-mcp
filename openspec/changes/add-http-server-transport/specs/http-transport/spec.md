## ADDED Requirements

### Requirement: HTTP Transport Support
The system SHALL support HTTP/SSE transport for MCP protocol communication in addition to the existing stdio transport.

#### Scenario: Server starts in HTTP mode
- **WHEN** the server is started with `MCP_TRANSPORT=http` environment variable
- **THEN** the server starts an HTTP server listening on the configured host and port
- **AND** the server accepts MCP protocol requests over HTTP
- **AND** the server provides streaming responses via Server-Sent Events (SSE)

#### Scenario: Server starts in stdio mode (default)
- **WHEN** the server is started without `MCP_TRANSPORT` or with `MCP_TRANSPORT=stdio`
- **THEN** the server uses stdio transport as before
- **AND** backward compatibility is maintained

#### Scenario: Configurable HTTP server address
- **WHEN** the server is started in HTTP mode with `MCP_HTTP_HOST` and `MCP_HTTP_PORT` environment variables
- **THEN** the server binds to the specified host and port
- **WHEN** no host is specified
- **THEN** the server defaults to `0.0.0.0` (all network interfaces)
- **WHEN** no port is specified
- **THEN** the server defaults to port `3000`

#### Scenario: MCP protocol over HTTP
- **WHEN** a client sends a JSON-RPC MCP request via POST to the HTTP endpoint
- **THEN** the server processes the request using the existing MCP server handlers
- **AND** the server returns JSON-RPC responses over HTTP
- **AND** the server streams server-to-client messages via SSE

#### Scenario: All calendar tools work over HTTP
- **WHEN** a client connects via HTTP transport
- **THEN** all existing calendar tools (list-calendars, create-event, search-events, etc.) function identically to stdio mode
- **AND** tool execution results are returned via HTTP/SSE

#### Scenario: Network accessibility
- **WHEN** the server is running in HTTP mode on `0.0.0.0`
- **THEN** clients on the local network can connect using the server's IP address and port
- **AND** clients on Tailscale network can connect using the Tailscale domain/IP and port
- **AND** the server handles requests from remote clients

### Requirement: Comprehensive Testing
The system SHALL include comprehensive tests for all exposed calendar tools, covering both happy paths and unhappy paths with clear error messages.

#### Scenario: Unit tests for all tools
- **WHEN** running unit tests with `yarn test`
- **THEN** all 8 calendar tools have unit tests (list-calendars, create-event, create-batch-events, delete-events-by-keyword, list-today-events, list-week-events, search-events, fix-event-times)
- **AND** tests use mocked AppleScript execution to avoid requiring actual Calendar app
- **AND** tests cover input validation for each tool

#### Scenario: Integration tests for all tools
- **WHEN** running integration tests
- **THEN** all 8 calendar tools have integration tests that interact with actual Calendar app
- **AND** tests verify successful operations with real calendar data
- **AND** tests verify error handling with invalid inputs and edge cases

#### Scenario: Error path testing
- **WHEN** testing with invalid inputs (missing required fields, invalid date formats, non-existent calendars)
- **THEN** tests verify that tools return clear, actionable error messages
- **AND** error messages include context about what failed and why
- **AND** error messages suggest possible solutions when applicable

#### Scenario: Testing over HTTP transport
- **WHEN** running tests in HTTP mode
- **THEN** all tools function identically to stdio mode
- **AND** tests verify SSE streaming functionality works correctly
- **AND** tests verify error responses are properly formatted over HTTP

### Requirement: Error Handling and Feedback
The system SHALL provide clear, actionable error messages for all failure scenarios, helping users understand what went wrong and how to fix it.

#### Scenario: Validation errors
- **WHEN** a tool receives invalid input (e.g., missing required field, wrong data type, invalid date format)
- **THEN** the tool returns an error message indicating which field is invalid
- **AND** the error message explains the expected format
- **AND** the error message includes an example of valid input

#### Scenario: Calendar errors
- **WHEN** a tool references a calendar that doesn't exist
- **THEN** the tool returns an error message indicating the calendar name is not found
- **AND** the error message suggests running list-calendars to see available calendars
- **AND** the error message includes a hint about case-sensitivity if applicable

#### Scenario: AppleScript execution errors
- **WHEN** AppleScript execution fails (e.g., permission denied, Calendar app not found)
- **THEN** the tool returns an error message indicating the underlying issue
- **AND** the error message suggests checking Calendar app permissions in System Preferences
- **AND** the error message includes steps to grant permissions if applicable

#### Scenario: Date/time format errors
- **WHEN** a date string is provided in an invalid format
- **THEN** the tool returns an error message showing the expected format (`YYYY-MM-DD HH:MM`)
- **AND** the error message includes an example with the invalid input highlighted
- **AND** the error message explains 24-hour time format requirement

#### Scenario: Batch operation partial failures
- **WHEN** a batch operation (e.g., create-batch-events) partially fails
- **THEN** the tool returns results indicating which items succeeded and which failed
- **AND** each failed item includes a specific error message explaining why it failed
- **AND** successful items are not affected by failures in other items

### Requirement: Yarn Package Management
The system SHALL be fully set up and installable using Yarn as the package manager.

#### Scenario: Yarn installation
- **WHEN** running `yarn install` in the project directory
- **THEN** all dependencies are installed successfully
- **AND** a yarn.lock file exists and is up to date
- **AND** all required dependencies are listed in package.json

#### Scenario: Yarn scripts
- **WHEN** checking package.json scripts
- **THEN** scripts use Yarn commands (e.g., `yarn start`, `yarn test`)
- **AND** a test script is configured to run tests with Jest
- **AND** a start script is configured to run the server

#### Scenario: Development dependencies
- **WHEN** installing with Yarn
- **THEN** Jest and testing-related dependencies are installed as devDependencies
- **AND** all development tooling works with Yarn

### Requirement: Comprehensive Documentation
The system SHALL include clear, comprehensive documentation covering setup, configuration, usage, testing, and troubleshooting.

#### Scenario: Setup documentation
- **WHEN** reading the README
- **THEN** clear instructions are provided for installation using Yarn
- **AND** prerequisites are listed (macOS, Node.js version, Yarn)
- **AND** setup steps are numbered and easy to follow

#### Scenario: HTTP mode documentation
- **WHEN** reading documentation for HTTP mode
- **THEN** instructions explain how to enable HTTP transport via environment variables
- **AND** examples show how to configure host and port
- **AND** examples show how to connect clients over HTTP
- **AND** Tailscale setup is documented if applicable

#### Scenario: Tool documentation
- **WHEN** reading documentation for each tool
- **THEN** each tool has a description, parameter list, and examples
- **AND** examples include both success cases and common error cases
- **AND** error messages are documented with explanations

#### Scenario: Testing documentation
- **WHEN** reading testing documentation
- **THEN** instructions explain how to run tests with `yarn test`
- **AND** test coverage expectations are documented
- **AND** instructions for running specific tests are provided

#### Scenario: Troubleshooting documentation
- **WHEN** reading troubleshooting documentation
- **THEN** common errors are listed with solutions
- **AND** permission issues are explained with steps to resolve
- **AND** network connectivity issues for HTTP mode are addressed

