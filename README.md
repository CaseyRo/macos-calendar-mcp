# macOS Calendar MCP Server

A Model Context Protocol (MCP) server for seamless macOS Calendar integration using AppleScript. No OAuth setup required!

## Features

- 🍎 **Native macOS Integration** - Uses AppleScript to interact directly with macOS Calendar
- 📅 **Full Calendar Management** - Create, list, and search calendar events
- 🚀 **Zero Configuration** - No OAuth, no API keys, just works out of the box
- 🔧 **MCP Compatible** - Works with Claude Code CLI and other MCP clients
- 📱 **Multi-Calendar Support** - Works with all your calendars (Personal, Work, etc.)

## Quick Start

### Prerequisites

- macOS (required for AppleScript support)
- Node.js 16+
- Yarn (recommended) or npm
- Calendar app (pre-installed on macOS)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/xybstone/macos-calendar-mcp.git
cd macos-calendar-mcp
```

2. Install dependencies using Yarn (recommended):
```bash
yarn install
```

Or using npm:
```bash
npm install
```

3. (Optional) Configure the server using a `.env` file:
```bash
cp .env.example .env
# Edit .env with your preferred settings
```

See [Configuration](#configuration) section below for details.

4. Grant permissions:
   - When first run, macOS will ask for Calendar app permissions
   - Grant access to allow the MCP server to manage your calendars

### Usage with Claude Code CLI

Add to your `.claude_project` file:

```json
{
  "mcpServers": {
    "macos-calendar": {
      "command": "node",
      "args": ["/path/to/macos-calendar-mcp/macos-calendar-mcp.js"]
    }
  }
}
```

Or run directly:
```bash
node macos-calendar-mcp-sdk.js
```

### Configuration

The server can be configured using a `.env` file or environment variables. The `.env` file approach is recommended for easier configuration management.

#### Using .env File (Recommended)

1. Copy the example configuration file:
```bash
cp .env.example .env
```

2. Edit `.env` with your preferred settings:
```env
# Transport mode: 'stdio' (default) or 'http'
MCP_TRANSPORT=stdio

# HTTP server configuration (only used when MCP_TRANSPORT=http)
MCP_HTTP_HOST=0.0.0.0
MCP_HTTP_PORT=3000
```

3. Start the server:
```bash
yarn start
# or
node macos-calendar-mcp-sdk.js
```

**Note**: The `.env` file is git-ignored to prevent committing sensitive configuration. Never commit your `.env` file to version control.

#### Using Environment Variables

You can also set environment variables directly:

```bash
MCP_TRANSPORT=http MCP_HTTP_HOST=0.0.0.0 MCP_HTTP_PORT=3000 node macos-calendar-mcp-sdk.js
```

#### Configuration Precedence

Configuration is loaded in the following order (highest priority first):
1. **Environment variables** (highest priority) - Override `.env` file values
2. **.env file** - Loaded if present
3. **Default values** (lowest priority) - Used if neither env vars nor .env are set

This means environment variables will always override `.env` file values, allowing you to override settings when needed.

#### Configuration Options

- `MCP_TRANSPORT` - Transport mode: `stdio` (default) or `http`
  - `stdio`: Standard input/output transport for local process communication
  - `http`: HTTP/SSE transport for network access

- `MCP_HTTP_HOST` - Host to bind HTTP server (default: `0.0.0.0`)
  - Use `0.0.0.0` for all network interfaces (network access)
  - Use `127.0.0.1` for localhost only

- `MCP_HTTP_PORT` - Port number for HTTP server (default: `3000`)
  - Change if port 3000 is already in use

### HTTP Mode (Network Access)

The server supports HTTP/SSE transport for network access, allowing remote clients to connect over HTTP. This is useful for accessing the server from other machines on your local network or via Tailscale.

#### Enable HTTP Mode

**Using .env file:**
```bash
# In .env file
MCP_TRANSPORT=http
MCP_HTTP_HOST=0.0.0.0
MCP_HTTP_PORT=3000
```

**Using environment variables:**
```bash
MCP_TRANSPORT=http node macos-calendar-mcp-sdk.js
```

When running in HTTP mode, the server will:
- Listen on the configured host and port
- Accept MCP protocol requests at `POST /mcp`
- Provide SSE streaming at `GET /mcp`
- Expose a health check endpoint at `GET /health`

**Example .env configuration for HTTP mode:**
```env
MCP_TRANSPORT=http
MCP_HTTP_HOST=0.0.0.0
MCP_HTTP_PORT=3000
```

#### Accessing from Network

Once running in HTTP mode on `0.0.0.0`, clients can connect using:

- Local network: `http://<server-ip>:3000/mcp`
- Tailscale: `http://<tailscale-domain>:3000/mcp` (if configured)

#### Example HTTP Client

See `examples/http-client.js` for a complete example of connecting to the server over HTTP. The example demonstrates:

- Creating a client with `StreamableHTTPClientTransport`
- Connecting to the server
- Calling tools via HTTP
- Error handling

```bash
# Start server
MCP_TRANSPORT=http node macos-calendar-mcp-sdk.js

# Run client example (in another terminal)
node examples/http-client.js
```

#### Security Note

The initial version of HTTP mode does not include authentication. It's recommended to:
- Use Tailscale for encrypted mesh VPN access
- Run on a trusted local network
- Consider firewall rules to restrict access

Authentication may be added in future versions.

## Available Tools

| Tool                       | Description                       | Parameters                                                             |
| -------------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| `list-calendars`           | List all available calendars      | None                                                                   |
| `create-event`             | Create a new calendar event       | `title`, `startDate`, `endDate`, `calendar`, `description`, `location` |
| `create-batch-events`      | Create multiple events at once    | `events` (array), `calendar` (optional)                                |
| `delete-events-by-keyword` | Delete events matching a keyword  | `keyword`, `calendar` (optional), `confirm` (boolean)                  |
| `list-today-events`        | List today's events               | `calendar` (optional)                                                  |
| `list-week-events`         | List events for a specific week   | `weekStart` (YYYY-MM-DD), `calendar` (optional)                        |
| `search-events`            | Search events by keyword          | `query`, `calendar` (optional)                                         |
| `fix-event-times`          | Fix event times for specific date | `calendar`, `datePattern` (YYYY-MM-DD), `corrections` (array)          |

## Examples

### Create an Event
```javascript
{
  "title": "Team Meeting",
  "startDate": "2025-07-05 14:00",
  "endDate": "2025-07-05 15:00",
  "calendar": "Work",
  "description": "Weekly team sync",
  "location": "Conference Room A"
}
```

### List Calendars
```javascript
// Returns all available calendars
```

### Search Events
```javascript
{
  "query": "meeting",
  "calendar": "Work"
}
```

## Date Format

Use the format: `YYYY-MM-DD HH:MM` (24-hour format)

Examples:
- `2025-07-05 14:00` (2:00 PM)
- `2025-12-25 09:30` (9:30 AM)
- `2025-07-10 18:00` (6:00 PM)

**Time Zone Handling:**
- Uses native macOS time handling to avoid timezone conversion issues
- All times are interpreted in your system's local timezone
- No UTC conversion or daylight saving adjustments needed

## Supported Calendars

Works with all macOS Calendar calendars including:
- Personal calendars
- Work calendars
- Shared calendars
- Subscribed calendars (iCloud, Google, etc.)

## Testing

### Running Tests

Run tests using Yarn:
```bash
yarn test
```

Or using npm:
```bash
npm test
```

### Test Structure

- **Unit Tests**: Located in `__tests__/` directory
  - Mock AppleScript execution to avoid requiring actual Calendar app
  - Test input validation and error handling
  - Test date formatting and utility functions
  - Cover all 8 calendar tools with happy paths and error scenarios

- **Integration Tests**: (Future) Will test with actual Calendar app
  - Require macOS environment with Calendar app
  - Test full tool functionality with real calendar data
  - Test HTTP transport with actual network connections

### Test Coverage Expectations

Current test coverage targets:
- **Unit Tests**: All tools have basic unit tests covering:
  - ✅ Input validation (missing required fields, invalid formats)
  - ✅ Date format validation
  - ✅ Calendar not found errors
  - ✅ Permission errors
  - ✅ Happy path scenarios

- **Coverage Goals**:
  - Core tool functions: ~80% coverage
  - Error handling paths: ~90% coverage
  - Utility functions (date formatting): 100% coverage

To view coverage:
```bash
yarn test --coverage
```

### HTTP Client Example

An example HTTP client is available in `examples/http-client.js`:

```bash
# Start server in HTTP mode first
MCP_TRANSPORT=http node macos-calendar-mcp-sdk.js

# In another terminal, run the client
node examples/http-client.js
```

The example demonstrates:
- Connecting to the MCP server over HTTP
- Listing available tools
- Calling calendar tools (list-calendars, create-event, search-events)
- Error handling

### Writing Tests

Tests use Jest with ES module support. Mock `execSync` from `child_process` to avoid requiring actual Calendar app access:

```javascript
import { jest } from '@jest/globals';
import { execSync } from 'child_process';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));
```

## Error Handling

All tools provide clear, actionable error messages:

### Common Errors

1. **Validation Errors**: Missing required fields or invalid formats
   - Example: `❌ 验证错误：缺少必需参数 "title"`
   - Solution: Check tool documentation for required parameters

2. **Date Format Errors**: Invalid date/time format
   - Example: `❌ 日期格式错误：startDate "invalid" 格式无效`
   - Solution: Use format `YYYY-MM-DD HH:MM` (24-hour time)

3. **Calendar Not Found**: Calendar name doesn't exist
   - Example: `⚠️ 日历 "NonExistent" 未找到`
   - Solution: Use `list-calendars` to see available calendars (case-sensitive)

4. **Permission Errors**: macOS Calendar app permissions denied
   - Example: `⚠️ 权限错误：macOS 需要授予 Calendar 应用权限`
   - Solution: System Settings → Privacy & Security → Calendar → Enable Terminal/App access

All error messages include:
- ❌ Clear error indicators
- ⚠️ Context about what failed and why
- 💡 Actionable guidance on how to fix the issue

## Troubleshooting

### Permission Issues
If you get permission errors:
1. Open System Preferences → Security & Privacy → Privacy
2. Select "Calendar" from the left sidebar
3. Ensure Terminal (or your app) has access

### AppleScript Errors
- Ensure Calendar app is installed and accessible
- Check calendar names are correct (case-sensitive)
- Verify date formats match the expected pattern

### Time Zone Issues
If events appear at wrong times:
1. Check your system timezone settings
2. Use the `fix-event-times` tool to correct existing events
3. Ensure date format is `YYYY-MM-DD HH:MM` in 24-hour format
4. The MCP uses native macOS time handling to avoid conversion issues

### HTTP Mode Issues

**Server won't start:**
- Check if port is already in use: `lsof -i :3000`
- Verify environment variables are set correctly
- Check firewall settings if accessing from remote machines

**Can't connect from remote machine:**
- Ensure server is bound to `0.0.0.0` (not `127.0.0.1`)
- Check firewall allows incoming connections on the port
- Verify network connectivity between machines
- For Tailscale: Ensure both machines are on the same Tailnet

## Contributing

1. Fork the repository
2. Create a feature branch
3. Install dependencies: `yarn install`
4. Make your changes
5. Run tests: `yarn test`
6. Test thoroughly on macOS
7. Submit a pull request

### Development Setup

```bash
# Install dependencies
yarn install

# Copy .env.example to .env and customize
cp .env.example .env

# Run tests
yarn test

# Run in stdio mode (default)
yarn start

# Run in HTTP mode (using .env file)
# Edit .env: MCP_TRANSPORT=http
yarn start

# Or override with environment variable
MCP_TRANSPORT=http yarn start
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Why This MCP?

Unlike Google Calendar integrations that require complex OAuth setups, this MCP:
- ✅ Works immediately with no configuration
- ✅ Integrates with your existing macOS Calendar setup
- ✅ Supports all calendar sources (iCloud, Google, Exchange, etc.)
- ✅ Requires no internet connection for basic operations
- ✅ Respects your privacy - everything runs locally

Perfect for developers who want calendar integration without the OAuth headache!

## Privacy & Security

- ✅ **Local Processing**: All calendar operations run locally on your machine
- ✅ **No Data Upload**: Your calendar data never leaves your device
- ✅ **Privacy Focused**: No OAuth tokens, no cloud services, no tracking
- ⚠️ **Private Data**: When testing, avoid committing files containing personal events to public repositories

## Data Protection

The project includes `.gitignore` patterns to prevent accidental commits of private event data:
- `*events*.json` - Event data files
- `*meetings*.json` - Meeting schedules
- `*schedule*.json` - Schedule files
- `private-*.json` - Any private data files
