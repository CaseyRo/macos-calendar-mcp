# Change: Add All-Day Event Support

## Why
Currently, the `create-event` and `create-batch-events` tools only support timed events with specific start and end times. Users need the ability to create all-day events, which are a common calendar event type. All-day events span entire days without specific times and are displayed differently in calendar applications. This feature will enable users to create events like holidays, birthdays, or multi-day events that don't require specific time slots.

## What Changes
- **MODIFIED**: `create-event` tool to accept an optional `allDay` boolean parameter
- **MODIFIED**: `create-batch-events` tool to support `allDay` property in event objects
- When `allDay` is `true`, the event SHALL be created as an all-day event in the Calendar app
- For all-day events, the start date SHALL be interpreted as the beginning of the all-day period (12:00 AM on that date)
- For all-day events, the end date SHALL be interpreted as the end of the all-day period (12:00 AM on the day after the end date, per Calendar app conventions)
- The AppleScript implementation SHALL set the `allday event` property to `true` when creating all-day events
- Date format remains the same (`YYYY-MM-DD HH:MM`), but times are adjusted automatically for all-day events
- Response format remains unchanged (JSON with success status and event details)
- **NO BREAKING CHANGES**: Existing behavior for timed events remains unchanged when `allDay` is not specified or `false`

## Impact
- Affected specs: `mcp-tools` (modify existing create-event requirement)
- Affected code:
  - `macos-calendar-mcp-sdk.js` - `createEvent()` and `createBatchEvents()` methods
  - Tool input schemas for `create-event` and `create-batch-events`
- User experience: Users can now create all-day events by setting `allDay: true` in the event parameters
- Compatibility: Fully backward compatible - existing calls without `allDay` parameter work exactly as before

