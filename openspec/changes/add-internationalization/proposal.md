# Change: Add Internationalization Support

## Why
The codebase currently contains hardcoded Chinese text in tool descriptions, error messages, and user-facing strings. This limits accessibility for non-Chinese speakers and makes it difficult to maintain consistent messaging across different languages. A proper internationalization (i18n) strategy is needed to support multiple languages (Chinese, English, German) using a maintainable, standard approach.

## What Changes
- Add i18n library dependency (i18next) for translation management
- Create JSON translation files for Chinese (zh), English (en), and German (de)
- Refactor all hardcoded Chinese strings to use translation keys
- Add language configuration via environment variable (defaults to English)
- Update tool descriptions, error messages, and user-facing text to use i18n
- Maintain backward compatibility during transition

## Impact
- Affected specs: New capability `i18n` for internationalization
- Affected code:
  - `macos-calendar-mcp-sdk.js` - All tool descriptions and error messages
  - `__tests__/macos-calendar-server.test.js` - Test assertions for error messages
  - `README.md` - Documentation examples
- New dependencies: `i18next` library
- Configuration: New `LANGUAGE` environment variable (defaults to `en`)

