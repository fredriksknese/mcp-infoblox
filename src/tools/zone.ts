import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { InfobloxClient } from "../infoblox-client.js";

function toolResult(text: string, isError = false) {
  return { content: [{ type: "text" as const, text }], isError };
}

export function registerZoneTools(
  server: McpServer,
  client: InfobloxClient,
) {
  // ── Get Zones ───────────────────────────────────────────────────────
  server.tool(
    "get_zones",
    "Search and list DNS authoritative zones in Infoblox",
    {
      fqdn: z
        .string()
        .optional()
        .describe("Zone FQDN to search for (supports regex)"),
      view: z.string().optional().describe("DNS view to filter by"),
      zone_format: z
        .enum(["FORWARD", "IPv4", "IPv6"])
        .optional()
        .describe("Zone format: FORWARD, IPv4 (reverse), or IPv6 (reverse)"),
      max_results: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum results"),
    },
    async ({ fqdn, view, zone_format, max_results }) => {
      const params: Record<string, string> = {
        _max_results: String(max_results),
        _return_fields:
          "fqdn,view,zone_format,comment,disable,ns_group,soa_email,network_view",
      };
      if (fqdn) params["fqdn~"] = fqdn;
      if (view) params.view = view;
      if (zone_format) params.zone_format = zone_format;

      try {
        const results = await client.get("zone_auth", params);
        return toolResult(JSON.stringify(results, null, 2));
      } catch (error) {
        return toolResult(
          `Error fetching zones: ${error}`,
          true,
        );
      }
    },
  );

  // ── Create Zone ─────────────────────────────────────────────────────
  server.tool(
    "create_zone",
    "Create a DNS authoritative zone in Infoblox",
    {
      fqdn: z
        .string()
        .describe(
          "Fully qualified domain name for the zone (e.g., example.com or 168.192.in-addr.arpa for reverse)",
        ),
      view: z.string().optional().describe("DNS view"),
      zone_format: z
        .enum(["FORWARD", "IPv4", "IPv6"])
        .optional()
        .default("FORWARD")
        .describe("Zone format"),
      comment: z.string().optional().describe("Comment"),
      grid_primary: z
        .array(
          z.object({
            name: z.string().describe("Grid member FQDN"),
            _struct: z
              .literal("memberserver")
              .default("memberserver"),
          }),
        )
        .optional()
        .describe("Primary DNS server members"),
      grid_secondaries: z
        .array(
          z.object({
            name: z.string().describe("Grid member FQDN"),
            _struct: z
              .literal("memberserver")
              .default("memberserver"),
          }),
        )
        .optional()
        .describe("Secondary DNS server members"),
      ns_group: z
        .string()
        .optional()
        .describe("Name server group name"),
    },
    async ({
      fqdn,
      view,
      zone_format,
      comment,
      grid_primary,
      grid_secondaries,
      ns_group,
    }) => {
      const data: Record<string, unknown> = { fqdn };
      if (view) data.view = view;
      if (zone_format) data.zone_format = zone_format;
      if (comment) data.comment = comment;
      if (grid_primary) data.grid_primary = grid_primary;
      if (grid_secondaries)
        data.grid_secondaries = grid_secondaries;
      if (ns_group) data.ns_group = ns_group;

      try {
        const ref = await client.create("zone_auth", data);
        return toolResult(
          `Zone created successfully.\nReference: ${ref}`,
        );
      } catch (error) {
        return toolResult(
          `Error creating zone: ${error}`,
          true,
        );
      }
    },
  );

  // ── Delete Zone ─────────────────────────────────────────────────────
  server.tool(
    "delete_zone",
    "Delete a DNS authoritative zone from Infoblox",
    {
      ref: z
        .string()
        .describe(
          "Object reference of the zone to delete (e.g., zone_auth/ZG5z...)",
        ),
    },
    async ({ ref }) => {
      try {
        const result = await client.delete(ref);
        return toolResult(
          `Zone deleted successfully.\nReference: ${result}`,
        );
      } catch (error) {
        return toolResult(
          `Error deleting zone: ${error}`,
          true,
        );
      }
    },
  );
}
