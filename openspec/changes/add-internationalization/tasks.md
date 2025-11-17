## 1. Research and Setup
- [ ] 1.1 Research i18next library and its usage patterns
- [ ] 1.2 Verify i18next compatibility with ES modules
- [ ] 1.3 Create directory structure for translation files (`locales/` or `i18n/`)
- [ ] 1.4 Install i18next dependency

## 2. Translation File Structure
- [ ] 2.1 Create `locales/en.json` with English translations
- [ ] 2.2 Create `locales/zh.json` with Chinese translations (extract existing Chinese text)
- [ ] 2.3 Create `locales/de.json` with German translations
- [ ] 2.4 Define translation key structure (tools, errors, messages)

## 3. i18n Infrastructure
- [ ] 3.1 Create i18n initialization module/function
- [ ] 3.2 Configure i18next with language detection from environment variable
- [ ] 3.3 Add `LANGUAGE` environment variable support (default: `en`)
- [ ] 3.4 Create helper function for translation lookups

## 4. Refactor Tool Descriptions
- [ ] 4.1 Replace hardcoded Chinese in `list-calendars` tool description
- [ ] 4.2 Replace hardcoded Chinese in `create-event` tool description and parameters
- [ ] 4.3 Replace hardcoded Chinese in `create-batch-events` tool description
- [ ] 4.4 Replace hardcoded Chinese in `delete-events-by-keyword` tool description
- [ ] 4.5 Replace hardcoded Chinese in `list-today-events` tool description
- [ ] 4.6 Replace hardcoded Chinese in `list-week-events` tool description
- [ ] 4.7 Replace hardcoded Chinese in `search-events` tool description
- [ ] 4.8 Replace hardcoded Chinese in `fix-event-times` tool description
- [ ] 4.9 Update OpenAI-compatible tools (`search`, `fetch`) if they have Chinese text

## 5. Refactor Error Messages
- [ ] 5.1 Replace date format error messages with i18n keys
- [ ] 5.2 Replace calendar not found error messages with i18n keys
- [ ] 5.3 Replace permission error messages with i18n keys
- [ ] 5.4 Replace validation error messages with i18n keys
- [ ] 5.5 Update error message formatting to support interpolation

## 5a. Translate Code Comments
- [ ] 5a.1 Translate Chinese code comments to English
- [ ] 5a.2 Update inline comments for clarity
- [ ] 5a.3 Ensure all developer-facing comments are in English

## 6. Update Tests
- [ ] 6.1 Update test assertions to use translation keys or language-agnostic patterns
- [ ] 6.2 Add tests for i18n initialization
- [ ] 6.3 Add tests for language switching
- [ ] 6.4 Verify all tests pass with English as default language

## 7. Documentation
- [ ] 7.1 Update README.md with i18n configuration instructions
- [ ] 7.2 Update .env.example with LANGUAGE variable
- [ ] 7.3 Document translation file structure

## 8. Validation
- [ ] 8.1 Test with English language (default)
- [ ] 8.2 Test with Chinese language
- [ ] 8.3 Test with German language
- [ ] 8.4 Verify all tool descriptions display correctly in all languages
- [ ] 8.5 Verify all error messages display correctly in all languages

