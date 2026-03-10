import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { ChatCompletionTool } from "openai/resources";
import config from "../../config";
import appLogger from "../../shared/logger";

const logger = appLogger.child({ module: "llm:mcp" });

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
  logger.debug({ url: MCP_URL }, "Connected to MCP server");
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

  logger.debug({ count: toolsCache.length }, "Fetched tools from MCP server");
  return toolsCache;
}

export async function callTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const client = await getClient();
  logger.debug({ tool: name }, "Calling MCP tool");

  const result = await client.callTool({ name, arguments: args });

  const content = (result.content as Array<{ type: string; text?: string }>)
    .filter((c) => c.type === "text" && c.text != null)
    .map((c) => c.text)
    .join("\n");

  logger.debug({ tool: name, length: content.length }, "MCP tool result");
  return content;
}
