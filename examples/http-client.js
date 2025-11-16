/**
 * Example HTTP client for connecting to macOS Calendar MCP Server in HTTP mode
 *
 * This demonstrates how to connect to the MCP server running in HTTP mode
 * and make requests to calendar tools.
 *
 * Prerequisites:
 * - Server running in HTTP mode: MCP_TRANSPORT=http node macos-calendar-mcp-sdk.js
 * - Server accessible at http://localhost:3000/mcp (or configured host/port)
 */

import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function main() {
  const serverUrl = process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp';

  console.log(`Connecting to MCP server at ${serverUrl}...`);

  try {
    // Create transport and client
    const transport = new StreamableHTTPClientTransport(
      new URL(serverUrl),
      {
        fetch: globalThis.fetch, // Use Node.js 18+ fetch or node-fetch
      }
    );

    const client = new Client(
      {
        name: 'example-http-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // Connect to server
    await client.connect(transport);
    console.log('✅ Connected to server');

    // List available tools
    const tools = await client.listTools();
    console.log('\n📋 Available tools:');
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });

    // Example 1: List calendars
    console.log('\n📅 Listing calendars...');
    const calendarsResult = await client.callTool({
      name: 'list-calendars',
      arguments: {},
    });
    console.log(calendarsResult.content[0].text);

    // Example 2: Create an event
    console.log('\n➕ Creating event...');
    const createResult = await client.callTool({
      name: 'create-event',
      arguments: {
        title: 'Example Event',
        startDate: '2025-01-15 14:00',
        endDate: '2025-01-15 15:00',
        calendar: 'Personal',
        description: 'Created via HTTP client',
        location: 'Remote',
      },
    });
    console.log(createResult.content[0].text);

    // Example 3: Search events
    console.log('\n🔍 Searching events...');
    const searchResult = await client.callTool({
      name: 'search-events',
      arguments: {
        query: 'Example',
        calendar: 'Personal',
      },
    });
    console.log(searchResult.content[0].text);

    // Close connection
    await client.close();
    console.log('\n✅ Disconnected from server');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

