#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { InfobloxClient } from "./infoblox-client.js";
import { registerDnsTools } from "./tools/dns.js";
import { registerNetworkTools } from "./tools/network.js";
import { registerDhcpTools } from "./tools/dhcp.js";
import { registerZoneTools } from "./tools/zone.js";
import { registerGridTools } from "./tools/grid.js";

function getConfig() {
  const host = process.env.INFOBLOX_HOST;
  const username = process.env.INFOBLOX_USERNAME;
  const password = process.env.INFOBLOX_PASSWORD;

  if (!host || !username || !password) {
    console.error(
      "Missing required environment variables: INFOBLOX_HOST, INFOBLOX_USERNAME, INFOBLOX_PASSWORD",
    );
    process.exit(1);
  }

  return {
    host,
    username,
    password,
    wapiVersion: process.env.INFOBLOX_WAPI_VERSION || "2.12",
    allowSelfSigned: process.env.INFOBLOX_ALLOW_SELF_SIGNED !== "false",
  };
}

async function main() {
  const config = getConfig();
  const client = new InfobloxClient(config);

  const server = new McpServer({
    name: "infoblox",
    version: "1.0.0",
  });

  registerDnsTools(server, client);
  registerNetworkTools(server, client);
  registerDhcpTools(server, client);
  registerZoneTools(server, client);
  registerGridTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Infoblox MCP server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
