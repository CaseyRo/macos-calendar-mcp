## Context
OpenAI's ChatGPT connectors and deep research require MCP servers to implement two standardized tools (`search` and `fetch`) that follow a specific response format. The current macOS Calendar MCP server has calendar-specific tools but lacks these OpenAI-compatible interfaces. We need to add these tools while leveraging existing AppleScript infrastructure and maintaining backward compatibility.

## Goals / Non-Goals

### Goals
- Implement `search` and `fetch` tools that conform to OpenAI's MCP specifications
- Map calendar events to OpenAI's expected schema (id, title, url, text, metadata)
- Generate stable, unique identifiers for calendar events
- Return responses in MCP content arrays with JSON-encoded strings
- Maintain compatibility with existing calendar tools

### Non-Goals
- Replacing existing calendar-specific tools (they remain available)
  - `search-events` tool will continue to exist alongside `search`
  - `search-events`: Calendar-specific, human-readable output, supports calendar filtering
  - `search`: OpenAI-compatible, JSON format, searches all calendars
- Changing the underlying AppleScript calendar interaction logic
- Implementing authentication/authorization (handled by OpenAI/MCP protocol)
- Supporting multiple calendar backends (macOS Calendar only)

## Decisions

### Decision: Event ID Generation Strategy
**What**: Use a composite ID format combining calendar name, event title, and start date/time to create stable, unique identifiers.

**Rationale**:
- Calendar events don't have native stable IDs in AppleScript
- Composite IDs ensure uniqueness across calendars
- Including date/time makes IDs deterministic and stable
- Format: `calendar-event-{calendarName}-{sanitizedTitle}-{startDateISO}`

**Alternatives considered**:
- UUID generation: Would be unique but not stable across searches
- Sequential IDs: Would require state management and aren't stable
- AppleScript event reference: Not serializable or stable

### Decision: URL Scheme for Events
**What**: Use a custom URL scheme `calendar://event/{id}` for citation purposes.

**Rationale**:
- Provides a canonical URL for OpenAI citation requirements
- Uses the generated event ID for consistency
- Custom scheme is appropriate for local calendar events
- Format: `calendar://event/{eventId}`

**Alternatives considered**:
- `file://` URLs: Not applicable for calendar events
- `https://` URLs: Would require a web service (not available)
- No URL: Doesn't meet OpenAI's requirement for citation URLs

### Decision: Event Text Format
**What**: Format event details as a structured text block including title, dates, location, description, and calendar name.

**Rationale**:
- Provides complete event information for AI model consumption
- Human-readable format suitable for research and analysis
- Includes all relevant metadata in a single text field
- Format:
  ```
  Title: {title}
  Calendar: {calendarName}
  Start: {startDate}
  End: {endDate}
  Location: {location}
  Description: {description}
  ```

**Alternatives considered**:
- JSON format in text field: Less readable for AI models
- Minimal text: Doesn't provide enough context
- Separate fields: OpenAI spec requires single `text` field

### Decision: Reuse Existing Search Infrastructure
**What**: Leverage the existing `search-events` AppleScript implementation for the `search` tool.

**Rationale**:
- Avoids code duplication
- Maintains consistency with existing search behavior
- Reduces maintenance burden
- Only need to transform the response format

**Alternatives considered**:
- New search implementation: Unnecessary duplication
- Different search algorithm: Would require justification and testing
- Client-side filtering: Not viable because OpenAI spec requires server-side search with `search(query)` interface
- Consolidating tools: Could deprecate `search-events` in favor of `search`, but that's a breaking change for existing users

### Decision: Keep Both Search Tools (For Now)
**What**: Maintain both `search-events` and `search` tools, with potential future consolidation.

**Rationale**:
- OpenAI requires `search` tool with specific interface (cannot be optional)
- `search-events` is already in use and has different output format (human-readable vs JSON)
- `search-events` supports calendar filtering, which `search` does not (per OpenAI spec)
- Keeping both avoids breaking existing users
- Can consider deprecating `search-events` in a future major version

**Alternatives considered**:
- Replace `search-events` with `search`: Breaking change, different output format
- Remove `search-events`: Breaks existing functionality
- Client-side filtering: OpenAI expects server-side search, and returning all events would be inefficient

### Decision: Metadata Structure
**What**: Include calendar name, start date, end date, and location in the `metadata` object.

**Rationale**:
- Provides structured access to event properties
- Useful for filtering and analysis
- Follows OpenAI's optional metadata pattern
- Format: `{"calendar": "...", "startDate": "...", "endDate": "...", "location": "..."}`

**Alternatives considered**:
- No metadata: Less useful for downstream processing
- All fields in metadata: Redundant with text field
- Different structure: Current structure is clear and useful

## Risks / Trade-offs

### Risk: ID Collision
**Risk**: Two events with same calendar, title, and start time could have identical IDs.

**Mitigation**: Include additional disambiguation (e.g., end time or description hash) if collisions detected. For most use cases, calendar + title + start time is sufficient.

### Risk: Performance with Large Calendars
**Risk**: Searching all events across all calendars could be slow for users with many events.

**Mitigation**:
- Leverage existing AppleScript search which is already optimized
- OpenAI limits results to 50 events, which naturally bounds the response size
- Current implementation should be acceptable for typical calendar sizes
- The 50-result limit prevents overburdening the server or client

### Risk: Date/Time Format Consistency
**Risk**: Date/time formatting differences between search and fetch could cause issues.

**Mitigation**: Use consistent date formatting functions across both tools. Reuse existing `formatDateForAppleScript` utilities.

### Trade-off: ID Stability vs. Uniqueness
**Trade-off**: More complex IDs (with more fields) are more unique but harder to generate and match.

**Decision**: Use calendar + title + start date/time as a balance. This provides good uniqueness for typical use cases while remaining simple.

## Migration Plan

### No Migration Required
- New tools are additive
- Existing tools remain unchanged
- No breaking changes to existing functionality
- Users can adopt new tools at their own pace

### Rollout Strategy
1. Implement `search` and `fetch` tools
2. Test with OpenAI connector examples
3. Update documentation
4. Release as part of next version

## Open Questions

- Should we support searching across all calendars or allow calendar filtering? (Initial: search all calendars for maximum compatibility)
- How should we handle recurring events? (Initial: treat each occurrence as a separate event)
- **Resolved**: Result limiting - OpenAI automatically limits results to 50 events, so no server-side limit needed

