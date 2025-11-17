## 1. Implementation
- [x] 1.1 Add `allDay` optional boolean parameter to `create-event` tool input schema
- [x] 1.2 Add `allDay` optional boolean property to event objects in `create-batch-events` tool input schema
- [x] 1.3 Update `createEvent()` method to handle `allDay` parameter
  - [x] 1.3.1 When `allDay` is `true`, adjust start date to 12:00 AM on the start date
  - [x] 1.3.2 When `allDay` is `true`, adjust end date to 12:00 AM on the day after the end date
  - [x] 1.3.3 Add `allday event: true` property to AppleScript event creation when `allDay` is `true`
- [x] 1.4 Update `createBatchEvents()` method to handle `allDay` property in event objects
  - [x] 1.4.1 Apply same date adjustment logic for each event with `allDay: true`
  - [x] 1.4.2 Ensure batch processing handles mixed all-day and timed events correctly
- [x] 1.5 Update date formatting logic to handle all-day event date adjustments
- [x] 1.6 Ensure response JSON includes `allDay` property in returned event details when applicable

## 2. Testing
- [ ] 2.1 Test `create-event` with `allDay: true` creates all-day event in Calendar app
- [ ] 2.2 Test `create-event` with `allDay: false` creates timed event (existing behavior)
- [ ] 2.3 Test `create-event` without `allDay` parameter creates timed event (backward compatibility)
- [ ] 2.4 Test `create-event` with `allDay: true` and verify start/end dates are correctly adjusted
- [ ] 2.5 Test `create-batch-events` with mixed all-day and timed events
- [ ] 2.6 Test `create-batch-events` with all events having `allDay: true`
- [ ] 2.7 Verify all-day events appear correctly in Calendar app (span full days, no time shown)
- [ ] 2.8 Test error handling for invalid date formats with all-day events
- [ ] 2.9 Verify response JSON includes `allDay` property when event is created as all-day

## 3. Documentation
- [x] 3.1 Update README.md to document `allDay` parameter for `create-event` tool
- [x] 3.2 Add examples showing how to create all-day events
- [x] 3.3 Document date interpretation for all-day events (start date = beginning of day, end date = end of day)
- [x] 3.4 Update `create-batch-events` documentation to include `allDay` property in event objects

