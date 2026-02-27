import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { InfobloxClient } from "../infoblox-client.js";

function toolResult(text: string, isError = false) {
  return { content: [{ type: "text" as const, text }], isError };
}

export function registerNetworkTools(
  server: McpServer,
  client: InfobloxClient,
) {
  // ── Get Networks ────────────────────────────────────────────────────
  server.tool(
    "get_networks",
    "Search and list networks in Infoblox IPAM. Returns network address, comment, view, and utilization info.",
    {
      network: z
        .string()
        .optional()
        .describe(
          "Network in CIDR notation to search for (e.g., 10.0.0.0/24). Supports regex.",
        ),
      network_view: z
        .string()
        .optional()
        .describe("Network view to filter by"),
      comment: z
        .string()
        .optional()
        .describe("Comment to search for (regex)"),
      max_results: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum results to return"),
      return_fields: z
        .string()
        .optional()
        .describe("Comma-separated return fields"),
    },
    async ({
      network,
      network_view,
      comment,
      max_results,
      return_fields,
    }) => {
      const params: Record<string, string> = {
        _max_results: String(max_results),
        _return_fields:
          return_fields ||
          "network,comment,network_view,members,options,extattrs,utilization",
      };
      if (network) params["network~"] = network;
      if (network_view) params.network_view = network_view;
      if (comment) params["comment~"] = comment;

      try {
        const results = await client.get("network", params);
        return toolResult(JSON.stringify(results, null, 2));
      } catch (error) {
        return toolResult(`Error fetching networks: ${error}`, true);
      }
    },
  );

  // ── Create Network ──────────────────────────────────────────────────
  server.tool(
    "create_network",
    "Create a new network in Infoblox IPAM",
    {
      network: z
        .string()
        .describe(
          "Network address in CIDR notation (e.g., 192.168.1.0/24)",
        ),
      network_view: z
        .string()
        .optional()
        .describe("Network view (defaults to 'default')"),
      comment: z
        .string()
        .optional()
        .describe("Description for the network"),
      members: z
        .array(
          z.object({
            _struct: z
              .literal("dhcpmember")
              .default("dhcpmember"),
            name: z.string().describe("Grid member FQDN"),
          }),
        )
        .optional()
        .describe("DHCP member assignments"),
      options: z
        .array(
          z.object({
            name: z.string().describe("Option name (e.g., routers)"),
            num: z.number().describe("Option number"),
            use_option: z.boolean().default(true),
            value: z.string().describe("Option value"),
            vendor_class: z.string().default("DHCP"),
          }),
        )
        .optional()
        .describe("DHCP options (routers, dns-servers, etc.)"),
    },
    async ({ network, network_view, comment, members, options }) => {
      const data: Record<string, unknown> = { network };
      if (network_view) data.network_view = network_view;
      if (comment) data.comment = comment;
      if (members) data.members = members;
      if (options) data.options = options;

      try {
        const ref = await client.create("network", data);
        return toolResult(
          `Network created successfully.\nReference: ${ref}`,
        );
      } catch (error) {
        return toolResult(
          `Error creating network: ${error}`,
          true,
        );
      }
    },
  );

  // ── Delete Network ──────────────────────────────────────────────────
  server.tool(
    "delete_network",
    "Delete a network from Infoblox IPAM. Get the reference from get_networks first.",
    {
      ref: z
        .string()
        .describe(
          "Object reference of the network to delete (e.g., network/ZG5z...)",
        ),
    },
    async ({ ref }) => {
      try {
        const result = await client.delete(ref);
        return toolResult(
          `Network deleted successfully.\nReference: ${result}`,
        );
      } catch (error) {
        return toolResult(
          `Error deleting network: ${error}`,
          true,
        );
      }
    },
  );

  // ── Get Next Available IP ───────────────────────────────────────────
  server.tool(
    "get_next_available_ip",
    "Get the next available IP address(es) from a network. Use get_networks first to find the network reference.",
    {
      network_ref: z
        .string()
        .describe(
          "Object reference of the network (e.g., network/ZG5z...)",
        ),
      num: z
        .number()
        .optional()
        .default(1)
        .describe("Number of available IPs to retrieve"),
      exclude: z
        .array(z.string())
        .optional()
        .describe("IP addresses to exclude from results"),
    },
    async ({ network_ref, num, exclude }) => {
      const data: Record<string, unknown> = { num };
      if (exclude) data.exclude = exclude;

      try {
        const result = await client.callFunction(
          network_ref,
          "next_available_ip",
          data,
        );
        return toolResult(JSON.stringify(result, null, 2));
      } catch (error) {
        return toolResult(
          `Error getting next available IP: ${error}`,
          true,
        );
      }
    },
  );

  // ── Search IP Addresses ─────────────────────────────────────────────
  server.tool(
    "search_ip_addresses",
    "Search the IPv4 address space in Infoblox IPAM. Find used/unused IPs, check IP status, and see what objects use an IP.",
    {
      ip_address: z
        .string()
        .optional()
        .describe("Specific IP address to look up"),
      network: z
        .string()
        .optional()
        .describe("Network in CIDR to search within"),
      status: z
        .enum(["USED", "UNUSED"])
        .optional()
        .describe("Filter by address status"),
      network_view: z
        .string()
        .optional()
        .describe("Network view to search in"),
      max_results: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum results"),
    },
    async ({
      ip_address,
      network,
      status,
      network_view,
      max_results,
    }) => {
      const params: Record<string, string> = {
        _max_results: String(max_results),
        _return_fields:
          "ip_address,status,names,types,objects,mac_address,network,network_view,usage",
      };
      if (ip_address) params.ip_address = ip_address;
      if (network) params.network = network;
      if (status) params.status = status;
      if (network_view) params.network_view = network_view;

      try {
        const results = await client.get("ipv4address", params);
        return toolResult(JSON.stringify(results, null, 2));
      } catch (error) {
        return toolResult(
          `Error searching IP addresses: ${error}`,
          true,
        );
      }
    },
  );

  // ── Get Network Details ─────────────────────────────────────────────
  server.tool(
    "get_network_details",
    "Get detailed information about a specific network including DHCP utilization statistics",
    {
      ref: z
        .string()
        .describe(
          "Network object reference (e.g., network/ZG5z...)",
        ),
      return_fields: z
        .string()
        .optional()
        .describe("Comma-separated fields to return"),
    },
    async ({ ref, return_fields }) => {
      const params: Record<string, string> = {
        _return_fields:
          return_fields ||
          "network,comment,network_view,members,options,extattrs,dhcp_utilization,dynamic_hosts,static_hosts,total_hosts,utilization",
      };

      try {
        const result = await client.getByRef(ref, params);
        return toolResult(JSON.stringify(result, null, 2));
      } catch (error) {
        return toolResult(
          `Error fetching network details: ${error}`,
          true,
        );
      }
    },
  );
}
