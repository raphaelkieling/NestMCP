import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

/**
 * Creates and connects a new MCP (Model Context Protocol) client for testing
 *
 * @param port - The port number to connect to on localhost
 * @param sseArgs - Optional configuration for the SSE transport connection. Can include eventSourceInit and requestInit options.
 * @returns A connected MCP Client instance
 * @example
 * ```ts
 * const client = await createMCPClient(3000, {
 *   requestInit: {
 *     headers: {
 *       Authorization: 'Bearer token'
 *     }
 *   }
 * });
 * ```
 */
export async function createMCPClient(
  port: number,
  sseArgs: {
    eventSourceInit?: EventSourceInit;
    requestInit?: RequestInit;
  } = {},
): Promise<Client> {
  const client = new Client(
    { name: 'example-client', version: '1.0.0' },
    {
      capabilities: {
        tools: {},
        resources: {},
        resourceTemplates: {},
        prompts: {},
      },
    },
  );
  const sseUrl = new URL(`http://localhost:${port}/sse`);
  const transport = new SSEClientTransport(sseUrl, sseArgs);
  await client.connect(transport);
  return client;
}

/**
 * Creates and connects a new MCP (Model Context Protocol) client using Streamable HTTP for testing
 *
 * @param port - The port number to connect to on localhost
 * @param options - Optional configuration options for the streamable HTTP client
 * @returns A connected MCP Client instance
 * @example
 * ```ts
 * const client = await createStreamableMCPClient(3000, {
 *   requestInit: {
 *     headers: {
 *       'any-header': 'any-value'
 *     }
 *   }
 * });
 * ```
 */
export async function createStreamableMCPClient(
  port: number,
  options: {
    endpoint?: string;
    requestInit?: RequestInit;
  } = {},
): Promise<Client> {
  const endpoint = options.endpoint || '/mcp';
  const client = new Client(
    { name: 'example-client', version: '1.0.0' },
    {
      capabilities: {
        tools: {},
        resources: {},
        resourceTemplates: {},
        prompts: {},
      },
    },
  );
  const url = new URL(`http://localhost:${port}${endpoint}`);
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: options.requestInit,
  });
  await client.connect(transport);
  return client;
}
