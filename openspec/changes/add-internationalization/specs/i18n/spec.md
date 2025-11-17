# Internationalization (i18n) Specification

## ADDED Requirements

### Requirement: Translation File Management
The system SHALL support multiple languages through JSON-based translation files, with one file per language located in a `locales/` directory.

#### Scenario: Translation file structure
- **WHEN** the system initializes
- **THEN** it loads translation files from `locales/` directory
- **AND** supports at minimum three languages: English (`en.json`), Chinese (`zh.json`), and German (`de.json`)

#### Scenario: Missing translation file
- **WHEN** a translation file is missing for a requested language
- **THEN** the system falls back to English (`en.json`)
- **AND** logs a warning if in debug mode

### Requirement: Language Configuration
The system SHALL allow language selection via the `LANGUAGE` environment variable, defaulting to English if not specified.

#### Scenario: Language from environment variable
- **WHEN** `LANGUAGE=en` is set
- **THEN** the system uses English translations

#### Scenario: Language defaults to English
- **WHEN** `LANGUAGE` environment variable is not set
- **THEN** the system defaults to English (`en`)

#### Scenario: Language switching
- **WHEN** `LANGUAGE=zh` is set
- **THEN** the system uses Chinese translations
- **WHEN** `LANGUAGE=de` is set
- **THEN** the system uses German translations

### Requirement: Tool Description Translation
All MCP tool descriptions and parameter descriptions SHALL be translatable using i18n keys.

#### Scenario: Tool description in English
- **WHEN** `LANGUAGE=en` is set
- **AND** a client requests the tool list
- **THEN** all tool descriptions are returned in English

#### Scenario: Tool description in Chinese
- **WHEN** `LANGUAGE=zh` is set
- **AND** a client requests the tool list
- **THEN** all tool descriptions are returned in Chinese

#### Scenario: Tool description in German
- **WHEN** `LANGUAGE=de` is set
- **AND** a client requests the tool list
- **THEN** all tool descriptions are returned in German

### Requirement: Error Message Translation
All error messages SHALL be translatable using i18n keys, including validation errors, date format errors, calendar not found errors, and permission errors.

#### Scenario: Error message in English
- **WHEN** `LANGUAGE=en` is set
- **AND** a validation error occurs
- **THEN** the error message is returned in English

#### Scenario: Error message in Chinese
- **WHEN** `LANGUAGE=zh` is set
- **AND** a validation error occurs
- **THEN** the error message is returned in Chinese

#### Scenario: Error message with interpolation
- **WHEN** an error message contains dynamic values (e.g., calendar name, date)
- **THEN** the system interpolates the values into the translated message
- **AND** the message format is correct in all supported languages

### Requirement: Translation Key Organization
Translation keys SHALL be organized hierarchically by feature area: `tools.*` for tool descriptions, `errors.*` for error messages, and `messages.*` for general messages.

#### Scenario: Translation key structure
- **WHEN** accessing tool descriptions
- **THEN** keys follow the pattern `tools.<tool-name>.*`

#### Scenario: Error message keys
- **WHEN** accessing error messages
- **THEN** keys follow the pattern `errors.<error-type>.*`

### Requirement: i18n Library Integration
The system SHALL use the `i18next` library for translation management, initialized at server startup.

#### Scenario: i18next initialization
- **WHEN** the server starts
- **THEN** i18next is initialized with the configured language
- **AND** translation files are loaded from the `locales/` directory

#### Scenario: Translation lookup
- **WHEN** code requests a translation using a key
- **THEN** i18next returns the translated string for the current language
- **AND** supports interpolation of dynamic values

