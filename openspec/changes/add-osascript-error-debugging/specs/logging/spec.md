## ADDED Requirements

### Requirement: Time-Based Log Cleanup
The MCP server SHALL automatically clean up log files older than a configured retention period to prevent unlimited disk space usage.

#### Scenario: Log cleanup with configured retention period
- **WHEN** the server starts or runs periodic cleanup
- **AND** LOG_RETENTION_DAYS environment variable is set to a positive number (e.g., "7" for 7 days)
- **THEN** the server SHALL identify all log files older than the specified number of days
- **AND** the server SHALL delete log files that exceed the retention period
- **AND** cleanup operations SHALL be logged (files deleted, errors during cleanup)
- **AND** cleanup SHALL not interfere with active logging operations

#### Scenario: Log cleanup with default retention period
- **WHEN** the server starts or runs periodic cleanup
- **AND** LOG_RETENTION_DAYS environment variable is not set or is invalid
- **THEN** the server SHALL use a default retention period (e.g., 30 days)
- **AND** the server SHALL clean up log files older than the default retention period
- **AND** the default retention period SHALL be documented

#### Scenario: Log cleanup with no log files
- **WHEN** the server runs log cleanup
- **AND** no log files exist or all log files are within the retention period
- **THEN** the cleanup operation SHALL complete successfully without errors
- **AND** no files SHALL be deleted

#### Scenario: Log cleanup error handling
- **WHEN** log cleanup encounters an error (e.g., file permission issues, disk errors)
- **THEN** the error SHALL be logged to console.error
- **AND** cleanup SHALL continue processing remaining files
- **AND** cleanup errors SHALL NOT interrupt server operation or logging functionality

