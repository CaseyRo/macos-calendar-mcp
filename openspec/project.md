# Project Context

## Purpose
A Model Context Protocol (MCP) server that enables AI assistants to interact with macOS Calendar through AppleScript. Provides seamless calendar management (create, list, search events) without requiring OAuth setup or API keys. All operations run locally on macOS, ensuring privacy and zero configuration overhead.

## Tech Stack
- **Node.js** (>=16.0.0) - Runtime environment
- **ES Modules** - Module system (`type: "module"` in package.json)
- **@modelcontextprotocol/sdk** (^1.15.0) - MCP SDK for server implementation
- **AppleScript** - Native macOS Calendar integration via `osascript`
- **JavaScript (ES6+)** - Modern JavaScript features (async/await, classes, destructuring)

## Project Conventions

### Code Style
- **ES Modules**: Use `import`/`export` syntax exclusively
- **Class-based architecture**: Organize functionality in classes (e.g., `MacOSCalendarServer`)
- **Async/await**: Prefer async/await over callbacks for asynchronous operations
- **Error handling**: Use try/catch blocks with descriptive error messages
- **Naming**: 
  - Classes: PascalCase (e.g., `MacOSCalendarServer`)
  - Methods: camelCase (e.g., `listCalendars`, `createEvent`)
  - Variables: camelCase with descriptive names
- **Comments**: Code includes Chinese comments for tool descriptions and error messages
- **User output**: Emojis used in user-facing messages for better readability (📅, ✅, ❌, etc.)
- **Shebang**: Include `#!/usr/bin/env node` at the top of executable files

### Architecture Patterns
- **MCP Server Pattern**: Implements Model Context Protocol server interface
- **Tool-based API**: Exposes functionality as discrete tools (list-calendars, create-event, etc.)
- **AppleScript Bridge**: Uses `execSync` with `osascript` to execute AppleScript commands
- **Single Responsibility**: Each tool method handles one specific calendar operation
- **Error Wrapping**: AppleScript errors are caught and wrapped with descriptive messages
- **Date Handling**: Custom date formatting to avoid timezone issues (uses native macOS time handling)

### Testing Strategy
- Currently no test suite implemented (placeholder in package.json)
- Testing should be done manually on macOS with Calendar app
- Future testing considerations:
  - Unit tests for date formatting logic
  - Integration tests requiring macOS environment
  - Mock AppleScript execution for CI/CD

### Git Workflow
- Standard git workflow
- Main branch: `main`
- No specific branching strategy enforced
- Commit messages: Descriptive, conventional commits preferred
- **Privacy**: `.gitignore` excludes private event data files (`*events*.json`, `*meetings*.json`, `*schedule*.json`, `private-*.json`)

## Domain Context
- **MCP (Model Context Protocol)**: Protocol for AI assistants to interact with external systems
- **macOS Calendar**: Native macOS calendar application that supports multiple calendar sources (iCloud, Google, Exchange, etc.)
- **AppleScript**: macOS automation language for controlling applications
- **Calendar Events**: Have properties like title, start date, end date, description, location, and belong to a specific calendar
- **Privacy-first**: All operations run locally, no data leaves the device
- **Zero-configuration**: Works immediately after installation, no OAuth or API keys required
- **Permission Model**: macOS requires explicit Calendar app permissions granted through System Preferences

## Important Constraints
- **Platform**: macOS only (`os: ["darwin"]` in package.json)
- **Node.js Version**: Requires Node.js >=16.0.0
- **Calendar App**: Requires macOS Calendar app to be installed and accessible
- **Permissions**: Requires Calendar app permissions granted in System Preferences → Security & Privacy → Privacy → Calendar
- **Date Format**: Input dates must follow `YYYY-MM-DD HH:MM` format (24-hour format)
- **Calendar Names**: Calendar names are case-sensitive and must match exactly as they appear in Calendar app
- **Privacy**: Avoid committing files containing personal event data to public repositories
- **Single User**: Designed for single-user local execution, not multi-user or server deployment

## External Dependencies
- **@modelcontextprotocol/sdk**: Core MCP SDK providing server infrastructure, request handlers, and protocol implementation
- **macOS Calendar App**: Native macOS application that provides the calendar data and event management
- **osascript**: macOS command-line tool for executing AppleScript (included with macOS)
- **Node.js stdlib**: `child_process.execSync` for executing shell commands
