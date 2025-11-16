## ADDED Requirements

### Requirement: .env File Support
The system SHALL support loading configuration from a `.env` file in the project root directory, in addition to environment variables and default values.

#### Scenario: Load configuration from .env file
- **WHEN** a `.env` file exists in the project root with configuration values
- **AND** the server is started
- **THEN** the server loads configuration from the `.env` file
- **AND** the loaded values are used unless overridden by environment variables

#### Scenario: Environment variables override .env values
- **WHEN** both `.env` file and environment variables are set
- **AND** the same configuration key exists in both
- **THEN** environment variable values take precedence over `.env` file values
- **AND** the server uses the environment variable values

#### Scenario: Default values when no configuration provided
- **WHEN** neither `.env` file nor environment variables are set
- **THEN** the server uses default values (stdio mode, 0.0.0.0:3000 for HTTP)
- **AND** the server starts successfully

#### Scenario: .env.example template file
- **WHEN** checking the project repository
- **THEN** a `.env.example` file exists with all available configuration options
- **AND** the file includes comments explaining each option
- **AND** the file shows example values and default values
- **AND** the file can be copied to create a `.env` file

#### Scenario: .env file excluded from version control
- **WHEN** checking `.gitignore` file
- **THEN** `.env` is listed to prevent committing configuration
- **AND** `.env.example` is NOT in `.gitignore` (should be committed)

#### Scenario: Configuration loading order
- **WHEN** the server starts
- **THEN** configuration is loaded in this order: environment variables (highest priority) → `.env` file → defaults (lowest priority)
- **AND** values from higher priority sources override lower priority sources

#### Scenario: .env file configuration options
- **WHEN** creating a `.env` file
- **THEN** users can configure `MCP_TRANSPORT` (stdio or http)
- **AND** users can configure `MCP_HTTP_HOST` (default: 0.0.0.0)
- **AND** users can configure `MCP_HTTP_PORT` (default: 3000)
- **AND** all options are documented in `.env.example`

### Requirement: .env File Documentation
The system SHALL include clear documentation explaining how to use `.env` files for configuration.

#### Scenario: Setup documentation
- **WHEN** reading the README
- **THEN** instructions explain how to create a `.env` file from `.env.example`
- **AND** examples show how to configure the server using `.env` file
- **AND** examples show how to override `.env` values with environment variables

#### Scenario: .env.example documentation
- **WHEN** reading the `.env.example` file
- **THEN** each configuration option includes a comment explaining its purpose
- **AND** example values are provided showing the expected format
- **AND** default values are clearly indicated
- **AND** comments explain when each option is used

#### Scenario: Configuration precedence documentation
- **WHEN** reading the documentation
- **THEN** the precedence order is clearly explained (environment variables → .env → defaults)
- **AND** examples demonstrate how precedence works
- **AND** use cases for each configuration method are provided

