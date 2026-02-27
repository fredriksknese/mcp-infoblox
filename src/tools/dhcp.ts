import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { InfobloxClient } from "../infoblox-client.js";

function toolResult(text: string, isError = false) {
  return { content: [{ type: "text" as const, text }], isError };
}

export function registerDhcpTools(
  server: McpServer,
  client: InfobloxClient,
) {
  // ── Get Fixed Addresses ─────────────────────────────────────────────
  server.tool(
    "get_fixed_addresses",
    "Search and list DHCP fixed addresses (reservations) in Infoblox",
    {
      ipv4addr: z
        .string()
        .optional()
        .describe("IPv4 address to search for"),
      mac: z
        .string()
        .optional()
        .describe("MAC address to search for (e.g., 00:11:22:33:44:55)"),
      network: z
        .string()
        .optional()
        .describe("Network in CIDR to filter by"),
      network_view: z
        .string()
        .optional()
        .describe("Network view"),
      comment: z
        .string()
        .optional()
        .describe("Comment to search for (regex)"),
      max_results: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum results"),
    },
    async ({
      ipv4addr,
      mac,
      network,
      network_view,
      comment,
      max_results,
    }) => {
      const params: Record<string, string> = {
        _max_results: String(max_results),
        _return_fields:
          "ipv4addr,mac,name,comment,network,network_view,match_client,disable,options",
      };
      if (ipv4addr) params.ipv4addr = ipv4addr;
      if (mac) params.mac = mac;
      if (network) params.network = network;
      if (network_view) params.network_view = network_view;
      if (comment) params["comment~"] = comment;

      try {
        const results = await client.get("fixedaddress", params);
        return toolResult(JSON.stringify(results, null, 2));
      } catch (error) {
        return toolResult(
          `Error fetching fixed addresses: ${error}`,
          true,
        );
      }
    },
  );

  // ── Create Fixed Address ────────────────────────────────────────────
  server.tool(
    "create_fixed_address",
    "Create a DHCP fixed address (reservation) in Infoblox",
    {
      ipv4addr: z.string().describe("IPv4 address to reserve"),
      mac: z
        .string()
        .describe(
          "MAC address of the client (e.g., 00:11:22:33:44:55)",
        ),
      name: z
        .string()
        .optional()
        .describe("Name for the fixed address"),
      comment: z
        .string()
        .optional()
        .describe("Description"),
      network_view: z
        .string()
        .optional()
        .describe("Network view"),
      match_client: z
        .enum([
          "MAC_ADDRESS",
          "CLIENT_ID",
          "CIRCUIT_ID",
          "REMOTE_ID",
        ])
        .optional()
        .default("MAC_ADDRESS")
        .describe("Client matching method"),
      options: z
        .array(
          z.object({
            name: z.string().describe("Option name"),
            num: z.number().describe("Option number"),
            use_option: z.boolean().default(true),
            value: z.string().describe("Option value"),
            vendor_class: z.string().default("DHCP"),
          }),
        )
        .optional()
        .describe("DHCP options"),
    },
    async ({
      ipv4addr,
      mac,
      name,
      comment,
      network_view,
      match_client,
      options,
    }) => {
      const data: Record<string, unknown> = { ipv4addr, mac };
      if (name) data.name = name;
      if (comment) data.comment = comment;
      if (network_view) data.network_view = network_view;
      if (match_client) data.match_client = match_client;
      if (options) data.options = options;

      try {
        const ref = await client.create("fixedaddress", data);
        return toolResult(
          `Fixed address created successfully.\nReference: ${ref}`,
        );
      } catch (error) {
        return toolResult(
          `Error creating fixed address: ${error}`,
          true,
        );
      }
    },
  );

  // ── Delete Fixed Address ────────────────────────────────────────────
  server.tool(
    "delete_fixed_address",
    "Delete a DHCP fixed address from Infoblox",
    {
      ref: z
        .string()
        .describe(
          "Object reference of the fixed address to delete",
        ),
    },
    async ({ ref }) => {
      try {
        const result = await client.delete(ref);
        return toolResult(
          `Fixed address deleted successfully.\nReference: ${result}`,
        );
      } catch (error) {
        return toolResult(
          `Error deleting fixed address: ${error}`,
          true,
        );
      }
    },
  );

  // ── Get DHCP Leases ─────────────────────────────────────────────────
  server.tool(
    "get_dhcp_leases",
    "Get active DHCP leases from Infoblox. Shows current IP assignments from DHCP.",
    {
      address: z
        .string()
        .optional()
        .describe("IP address to search for"),
      network: z
        .string()
        .optional()
        .describe("Network in CIDR to filter by"),
      hardware: z
        .string()
        .optional()
        .describe("MAC address to search for"),
      max_results: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum results"),
    },
    async ({ address, network, hardware, max_results }) => {
      const params: Record<string, string> = {
        _max_results: String(max_results),
        _return_fields:
          "address,hardware,client_hostname,starts,ends,binding_state,network,network_view",
      };
      if (address) params.address = address;
      if (network) params.network = network;
      if (hardware) params.hardware = hardware;

      try {
        const results = await client.get("lease", params);
        return toolResult(JSON.stringify(results, null, 2));
      } catch (error) {
        return toolResult(
          `Error fetching leases: ${error}`,
          true,
        );
      }
    },
  );

  // ── Get DHCP Ranges ─────────────────────────────────────────────────
  server.tool(
    "get_dhcp_ranges",
    "List DHCP ranges (scopes) in Infoblox",
    {
      network: z
        .string()
        .optional()
        .describe("Network in CIDR to filter by"),
      network_view: z
        .string()
        .optional()
        .describe("Network view"),
      max_results: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum results"),
    },
    async ({ network, network_view, max_results }) => {
      const params: Record<string, string> = {
        _max_results: String(max_results),
        _return_fields:
          "start_addr,end_addr,network,network_view,comment,member,disable",
      };
      if (network) params.network = network;
      if (network_view) params.network_view = network_view;

      try {
        const results = await client.get("range", params);
        return toolResult(JSON.stringify(results, null, 2));
      } catch (error) {
        return toolResult(
          `Error fetching DHCP ranges: ${error}`,
          true,
        );
      }
    },
  );

  // ── Create DHCP Range ───────────────────────────────────────────────
  server.tool(
    "create_dhcp_range",
    "Create a DHCP range (scope) in Infoblox",
    {
      start_addr: z
        .string()
        .describe("Start IP address of the range"),
      end_addr: z
        .string()
        .describe("End IP address of the range"),
      network: z
        .string()
        .optional()
        .describe("Network the range belongs to (CIDR)"),
      network_view: z
        .string()
        .optional()
        .describe("Network view"),
      comment: z.string().optional().describe("Comment"),
      member: z
        .object({
          _struct: z
            .literal("dhcpmember")
            .default("dhcpmember"),
          name: z.string().describe("Grid member FQDN"),
        })
        .optional()
        .describe("DHCP member to serve this range"),
    },
    async ({
      start_addr,
      end_addr,
      network,
      network_view,
      comment,
      member,
    }) => {
      const data: Record<string, unknown> = {
        start_addr,
        end_addr,
      };
      if (network) data.network = network;
      if (network_view) data.network_view = network_view;
      if (comment) data.comment = comment;
      if (member) data.member = member;

      try {
        const ref = await client.create("range", data);
        return toolResult(
          `DHCP range created successfully.\nReference: ${ref}`,
        );
      } catch (error) {
        return toolResult(
          `Error creating DHCP range: ${error}`,
          true,
        );
      }
    },
  );
}
