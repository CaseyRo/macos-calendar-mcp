## 1. Analysis
- [x] 1.1 Identify all AppleScript workflows with empty `on error` blocks
- [x] 1.2 Document current error handling patterns across all osascript executions
- [x] 1.3 Identify what error information is available from AppleScript error objects
- [x] 1.4 Review current error forwarding to MCP users to identify what needs to be removed

## 2. Error Handling Implementation
- [x] 2.1 Replace empty `on error` blocks in `searchEvents` method (line 964)
- [x] 2.2 Replace empty `on error` blocks in OpenAI `search` tool (line 1313)
- [x] 2.3 Add error message capture in AppleScript error handlers
- [x] 2.4 Add error number capture for AppleScript error codes
- [x] 2.5 Include context information (event title, calendar name) in error reports

## 3. Logging and Debugging
- [x] 3.1 Add structured error logging for failed event processing
- [x] 3.2 Implement debug mode support (via DEBUG environment variable or similar)
- [x] 3.3 Add error statistics tracking (count of failed events per operation)
- [x] 3.4 Ensure error logging doesn't break operation flow (continue processing)
- [x] 3.5 Ensure all AppleScript errors are logged to console/stderr only, not forwarded to MCP users
- [x] 3.6 Remove any error details from MCP tool responses that expose internal implementation

## 4. Error Reporting
- [x] 4.1 Format error messages for developer debugging
- [x] 4.2 Include error context in console.error output
- [x] 4.3 Add error details to stderr when available
- [x] 4.4 Ensure errors are visible in both development and production modes
- [x] 4.5 Verify MCP tool responses contain only user-friendly error messages (no internal details)

## 5. Log Cleanup Implementation
- [x] 5.1 Design log file storage structure and location
- [x] 5.2 Add LOG_RETENTION_DAYS environment variable to .env configuration
- [x] 5.3 Implement log cleanup service that runs periodically or on startup
- [x] 5.4 Add logic to identify and delete log files older than configured retention period
- [x] 5.5 Add logging for cleanup operations (files deleted, errors during cleanup)
- [x] 5.6 Ensure cleanup doesn't interfere with active logging operations

## 6. Testing
- [ ] 6.1 Test error handling with malformed events
- [ ] 6.2 Test error handling with permission issues
- [ ] 6.3 Test error handling with missing event properties
- [ ] 6.4 Verify error logging doesn't break successful operations
- [ ] 6.5 Verify error handling continues processing other events
- [ ] 6.6 Verify errors are not forwarded to MCP users (only logged to console)
- [ ] 6.7 Test log cleanup with various retention periods
- [ ] 6.8 Test log cleanup with missing or invalid LOG_RETENTION_DAYS values
- [ ] 6.9 Test log cleanup with no log files (should not error)

## 7. Documentation
- [ ] 7.1 Document new error handling behavior
- [ ] 7.2 Document debug mode usage
- [ ] 7.3 Update troubleshooting guide with new error information
- [ ] 7.4 Document LOG_RETENTION_DAYS environment variable
- [ ] 7.5 Document log cleanup behavior and default retention period

