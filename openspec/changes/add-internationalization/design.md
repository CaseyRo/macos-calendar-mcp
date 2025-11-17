# Design: Internationalization Strategy

## Context
The macOS Calendar MCP server currently has hardcoded Chinese text throughout the codebase, including:
- Tool descriptions and parameter descriptions
- Error messages (validation, date format, calendar not found, permissions)
- User-facing messages
- Code comments (these may remain in Chinese or be converted to English)

The goal is to support multiple languages (Chinese, English, German) using a standard, maintainable approach with JSON-based translation files.

## Goals / Non-Goals

### Goals
- Support three languages: Chinese (zh), English (en), German (de)
- Use a single JSON file per language for all translations
- Use a well-maintained, standard Node.js i18n library
- Make language configurable via environment variable
- Maintain backward compatibility (default to English)
- Keep translation files organized and maintainable

### Non-Goals
- Runtime language switching (language is set at startup)
- Automatic language detection from system locale
- Pluralization rules (not needed for current use cases)
- Date/time formatting localization (handled separately)
- Translation validation at startup (deferred to future enhancement)
- Client-side language negotiation (language is server configuration)

## Decisions

### Decision: Use i18next Library
**What**: Use `i18next` as the internationalization library.

**Why**:
- Industry standard, well-maintained (actively developed, 7M+ weekly downloads)
- Excellent ES module support
- Simple JSON-based resource loading
- Supports interpolation for dynamic values
- Lightweight and performant
- Extensive documentation and community support

**Alternatives considered**:
- Custom JSON loader: Too simplistic, would need to reimplement interpolation
- `node-i18n`: Less maintained, fewer features
- `formatjs`: Overkill for this use case, designed for React
- `globalize`: More complex, requires CLDR data

### Decision: Single JSON File Per Language
**What**: One JSON file per language (`en.json`, `zh.json`, `de.json`) containing all translations.

**Why**:
- Simple structure, easy to maintain
- All translations in one place per language
- Easy to see what needs translation
- No need for complex namespace management

**Alternatives considered**:
- Multiple files per language (by feature): More complex, harder to maintain
- Nested structure: More complex, not needed for current scope

### Decision: Translation Key Structure
**What**: Use hierarchical keys organized by feature area:
- `tools.*` - Tool descriptions and parameter descriptions
- `errors.*` - Error messages
- `messages.*` - General user-facing messages

**Why**:
- Clear organization
- Easy to find related translations
- Prevents key collisions
- Scalable for future additions

### Decision: Environment Variable for Language
**What**: Use `LANGUAGE` environment variable (defaults to `en`).

**Why**:
- Consistent with existing environment variable pattern
- Simple configuration
- No runtime overhead
- Works with `.env` file support already in place
- MCP protocol doesn't have standard language negotiation in initialize request
- MCP servers are typically single-instance per user, so server-level language makes sense

**Alternatives considered**:
- Command-line argument: Less convenient, requires parsing
- System locale detection: May not match user preference
- Per-request language: Overkill for MCP server context, would require protocol extension
- Client language negotiation: MCP protocol doesn't support this in standard initialize request

**Note on Client Language**: The MCP server doesn't "know" what language the client speaks because:
1. MCP protocol (JSON-RPC based) doesn't include language preference in the standard `initialize` request
2. MCP servers are configured at the server level, not per-client
3. The language is a server configuration choice, similar to other server settings
4. If client-side language negotiation is needed in the future, it would require either:
   - A custom extension to the initialize request (non-standard)
   - A custom tool parameter (adds complexity)
   - A separate MCP capability (would need protocol support)

### Decision: Default Language is English
**What**: Default language is English (`en`) if `LANGUAGE` is not set.

**Why**:
- English is the most common language for technical tools
- Provides better accessibility for international users
- Maintains backward compatibility (current Chinese text will be preserved in `zh.json`)

## Risks / Trade-offs

### Risk: Translation Quality
**Risk**: German and English translations may not be accurate or natural.
**Mitigation**:
- Use clear, technical English as base
- Provide translation keys with context comments
- Allow community contributions for improvements

### Risk: Missing Translations
**Risk**: Some keys may be missing in one or more languages.
**Mitigation**:
- i18next supports fallback to default language
- Use English as fallback
- Add validation to check for missing keys in development

### Risk: Breaking Changes During Refactoring
**Risk**: Refactoring all strings could introduce bugs.
**Mitigation**:
- Incremental refactoring (one tool at a time)
- Comprehensive testing after each change
- Keep existing Chinese text as reference during migration

### Trade-off: Code Complexity
**Trade-off**: Adding i18n adds some complexity to the codebase.
**Benefit**: Much better maintainability and accessibility
**Cost**: Slight increase in code complexity, dependency on i18next

## Migration Plan

### Phase 1: Setup
1. Install i18next
2. Create translation file structure
3. Set up i18n initialization

### Phase 2: Extract Existing Chinese Text
1. Create `zh.json` with all existing Chinese strings
2. Map each string to a translation key
3. Verify all Chinese text is captured

### Phase 3: Create English Translations
1. Create `en.json` with English translations
2. Use clear, technical English
3. Maintain same structure as `zh.json`

### Phase 4: Create German Translations
1. Create `de.json` with German translations
2. Use technical German terminology
3. Verify accuracy (may need review)

### Phase 5: Refactor Code
1. Replace tool descriptions one by one
2. Replace error messages one by one
3. Translate code comments to English (separate from i18n, but done during refactoring)
4. Test after each change
5. Update tests to use translation keys or language-agnostic patterns

### Phase 6: Validation
1. Test with each language
2. Verify all strings are translated
3. Check for missing keys
4. Update documentation

## Open Questions (Resolved)

### Should code comments be translated?
**Decision**: Yes, translate code comments to English as part of this change. This is separate from i18n (comments are for developers, not end users) but should be done during the refactoring phase.

### Should we support more languages in the future?
**Decision**: Yes, the design supports easy addition of more languages. For now, focus on the three languages (Chinese, English, German). The JSON file structure and i18next setup make it straightforward to add more languages later.

### Should we validate translation completeness at startup?
**Decision**: No, defer this to a future enhancement. For now, rely on i18next's fallback mechanism and manual testing.

