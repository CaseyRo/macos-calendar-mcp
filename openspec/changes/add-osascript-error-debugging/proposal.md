# Change: Add Proper Debugging in osascript Execution

## Why

The AppleScript error handlers in osascript execution workflows (particularly in search operations) currently have empty `on error` blocks that silently swallow errors. This makes debugging difficult when events fail to process, as errors are completely hidden. Proper error logging and debugging information is essential for troubleshooting issues with calendar operations, especially when dealing with malformed events, permission issues, or unexpected data formats. Additionally, error information from AppleScript should be logged to the console for developers but not forwarded to MCP end users to avoid exposing internal implementation details.

## What Changes

- Replace empty `on error` blocks in AppleScript workflows with proper error handling that captures and reports error details
  - Update `searchEvents` method (line 964)
  - Update OpenAI `search` tool (line 1313)
- Add error logging to capture AppleScript execution errors with context (event details, calendar name, operation type)
- Implement structured error reporting that includes error messages, error numbers, and relevant context
- Ensure all error information is logged to console (stderr/console.error) but NOT forwarded to MCP end users
- Add debugging information to help identify which events are failing and why
- Ensure error handling doesn't break the overall operation flow (continue processing other events when individual events fail)
- Add optional debug mode support for verbose error logging
- Implement time-based log cleanup functionality that automatically removes log files older than X days (configurable via .env)

## Impact

- Affected specs: `mcp-tools` capability (error handling improvements), new `logging` capability (log cleanup)
- Affected code:
  - `macos-calendar-mcp-sdk.js` - Update `searchEvents` method and OpenAI `search` tool with proper error handlers
  - AppleScript error handling blocks in search operations (lines 964, 1313)
  - Error reporting and logging infrastructure
  - New log cleanup service/utility
  - `.env` configuration for log retention period

