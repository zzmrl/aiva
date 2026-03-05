import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ChatCompletionTool } from "openai/resources";
import createDebug from "debug";
import config from "../../config";

const debug = createDebug("api:llm:mcp");

const MCP_URL = "https://api.automate.it.com/mcp";

let mcpClient: Client | null = null;
let toolsCache: ChatCompletionTool[] | null = null;

export function hasMcp(): boolean {
  return !!config.AUTOMATE_IT_API_KEY;
}

async function getClient(): Promise<Client> {
  if (mcpClient) return mcpClient;

  const apiKey = config.AUTOMATE_IT_API_KEY;
  const client = new Client({ name: "aiva", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${apiKey}` } },
  });

  await client.connect(transport);
  debug("Connected to MCP server at %s", MCP_URL);
  mcpClient = client;
  return client;
}

export async function getTools(): Promise<ChatCompletionTool[]> {
  if (toolsCache) return toolsCache;

  const client = await getClient();
  const { tools } = await client.listTools();

  toolsCache = tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description ?? "",
      parameters: tool.inputSchema as Record<string, unknown>,
    },
  }));

  debug("Fetched %d tools from MCP server", toolsCache.length);
  return toolsCache;
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const client = await getClient();
  debug("Calling MCP tool: %s", name);

  const result = await client.callTool({ name, arguments: args });

  const content = (result.content as Array<{ type: string; text?: string }>)
    .filter((c) => c.type === "text" && c.text != null)
    .map((c) => c.text)
    .join("\n");

  debug("MCP tool %s result: %d chars", name, content.length);
  return content;
}
