## 1. Dependencies
- [x] 1.1 Install `dotenv` package using Yarn
- [x] 1.2 Add `dotenv` to package.json dependencies
- [x] 1.3 Verify dotenv installation with `yarn install`

## 2. Code Implementation
- [x] 2.1 Import `dotenv` at the top of `macos-calendar-mcp-sdk.js`
- [x] 2.2 Add `dotenv.config()` call at startup (before reading environment variables)
- [x] 2.3 Ensure existing environment variable reading logic remains unchanged
- [x] 2.4 Verify configuration precedence works correctly (env vars override .env)

## 3. Configuration Files
- [x] 3.1 Create `.env.example` file with all configuration options
- [x] 3.2 Add comments to `.env.example` explaining each option
- [x] 3.3 Include example values and default values in `.env.example`
- [x] 3.4 Verify `.env` is in `.gitignore` (already present)
- [x] 3.5 Verify `.env.example` is NOT in `.gitignore` (should be committed)

## 4. Documentation
- [x] 4.1 Update README with `.env` file setup instructions
- [x] 4.2 Add section explaining how to create `.env` from `.env.example`
- [x] 4.3 Document configuration precedence (env vars → .env → defaults)
- [x] 4.4 Add examples showing both `.env` file and environment variable usage
- [x] 4.5 Update HTTP mode section to mention `.env` file option
- [x] 4.6 Add note about not committing `.env` file

## 5. Testing
- [x] 5.1 Test server startup with `.env` file
- [x] 5.2 Test server startup with environment variables (should override .env)
- [x] 5.3 Test server startup without .env or env vars (should use defaults)
- [x] 5.4 Test with partial .env file (some options missing)
- [x] 5.5 Verify `.env` file is not committed to git

## 6. Validation
- [x] 6.1 Validate proposal with `openspec validate add-env-file-support --strict`
- [x] 6.2 Review code changes for linting errors
- [x] 6.3 Ensure backward compatibility with environment variables
- [x] 6.4 Verify documentation is complete and accurate

