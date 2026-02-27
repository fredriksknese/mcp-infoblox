import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { InfobloxClient } from "../infoblox-client.js";

function toolResult(text: string, isError = false) {
  return { content: [{ type: "text" as const, text }], isError };
}

export function registerGridTools(
  server: McpServer,
  client: InfobloxClient,
) {
  // ── Get Grid Info ───────────────────────────────────────────────────
  server.tool(
    "get_grid_info",
    "Get Infoblox grid information and configuration",
    {},
    async () => {
      try {
        const results = await client.get("grid", {
          _return_fields:
            "name,service_status,ntp_setting,dns_resolver_setting,email_setting",
        });
        return toolResult(JSON.stringify(results, null, 2));
      } catch (error) {
        return toolResult(
          `Error fetching grid info: ${error}`,
          true,
        );
      }
    },
  );

  // ── Get Grid Members ────────────────────────────────────────────────
  server.tool(
    "get_members",
    "List Infoblox grid members and their status",
    {
      name: z
        .string()
        .optional()
        .describe("Member hostname to search for"),
      max_results: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum results"),
    },
    async ({ name, max_results }) => {
      const params: Record<string, string> = {
        _max_results: String(max_results),
        _return_fields:
          "host_name,config_addr_type,platform,service_type_configuration,node_info,vip_setting,service_status",
      };
      if (name) params["host_name~"] = name;

      try {
        const results = await client.get("member", params);
        return toolResult(JSON.stringify(results, null, 2));
      } catch (error) {
        return toolResult(
          `Error fetching members: ${error}`,
          true,
        );
      }
    },
  );

  // ── Restart Services ────────────────────────────────────────────────
  server.tool(
    "restart_services",
    "Restart DNS/DHCP services on the Infoblox grid. Required after configuration changes to take effect.",
    {
      member: z
        .string()
        .optional()
        .describe(
          "Specific member FQDN to restart. Omit to restart all members with pending changes.",
        ),
      service: z
        .enum(["ALL", "DNS", "DHCP", "DHCPV4", "DHCPV6"])
        .optional()
        .default("ALL")
        .describe("Which service to restart"),
      mode: z
        .enum(["GROUPED", "SEQUENTIAL", "SIMULTANEOUS"])
        .optional()
        .default("GROUPED")
        .describe("Restart mode"),
    },
    async ({ member, service, mode }) => {
      try {
        const grids = (await client.get("grid")) as Array<{
          _ref: string;
        }>;
        if (!grids || grids.length === 0) {
          return toolResult(
            "Error: Could not find grid object",
            true,
          );
        }

        const gridRef = grids[0]._ref;
        const data: Record<string, unknown> = {
          restart_option: mode,
          service_option: service,
        };
        if (member) {
          data.member_order = "SPECIFICALLY";
          data.members = [member];
        }

        const result = await client.callFunction(
          gridRef,
          "restartservices",
          data,
        );
        return toolResult(
          `Services restart initiated.\n${JSON.stringify(result, null, 2)}`,
        );
      } catch (error) {
        return toolResult(
          `Error restarting services: ${error}`,
          true,
        );
      }
    },
  );

  // ── Get Object by Reference ─────────────────────────────────────────
  server.tool(
    "get_object_by_ref",
    "Get any Infoblox object by its reference string. Useful for retrieving full details of an object.",
    {
      ref: z
        .string()
        .describe(
          "Object reference string (e.g., record:a/ZG5z..., network/ZG5z...)",
        ),
      return_fields: z
        .string()
        .optional()
        .describe("Comma-separated list of fields to return"),
    },
    async ({ ref, return_fields }) => {
      const params: Record<string, string> = {};
      if (return_fields) params._return_fields = return_fields;

      try {
        const result = await client.getByRef(ref, params);
        return toolResult(JSON.stringify(result, null, 2));
      } catch (error) {
        return toolResult(
          `Error fetching object: ${error}`,
          true,
        );
      }
    },
  );

  // ── Global Search ───────────────────────────────────────────────────
  server.tool(
    "global_search",
    "Search across all Infoblox object types. Finds records, networks, and other objects matching a search string.",
    {
      search_string: z
        .string()
        .describe(
          "String to search for across all objects (IP, hostname, MAC, comment, etc.)",
        ),
      object_type: z
        .string()
        .optional()
        .describe(
          "Limit search to a specific object type (e.g., record:a, network, fixedaddress)",
        ),
      max_results: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum results"),
    },
    async ({ search_string, object_type, max_results }) => {
      const params: Record<string, string> = {
        _max_results: String(max_results),
        search_string: search_string,
      };
      if (object_type) params.objtype = object_type;

      try {
        const results = await client.get("search", params);
        return toolResult(JSON.stringify(results, null, 2));
      } catch (error) {
        return toolResult(
          `Error performing global search: ${error}`,
          true,
        );
      }
    },
  );

  // ── Get Network Views ───────────────────────────────────────────────
  server.tool(
    "get_network_views",
    "List network views configured in Infoblox",
    {
      name: z
        .string()
        .optional()
        .describe("Network view name to search for"),
    },
    async ({ name }) => {
      const params: Record<string, string> = {
        _return_fields: "name,comment,is_default,extattrs",
      };
      if (name) params.name = name;

      try {
        const results = await client.get("networkview", params);
        return toolResult(JSON.stringify(results, null, 2));
      } catch (error) {
        return toolResult(
          `Error fetching network views: ${error}`,
          true,
        );
      }
    },
  );

  // ── Get DNS Views ──────────────────────────────────────────────────
  server.tool(
    "get_dns_views",
    "List DNS views configured in Infoblox",
    {
      name: z
        .string()
        .optional()
        .describe("DNS view name to search for"),
    },
    async ({ name }) => {
      const params: Record<string, string> = {
        _return_fields:
          "name,comment,is_default,network_view,extattrs",
      };
      if (name) params.name = name;

      try {
        const results = await client.get("view", params);
        return toolResult(JSON.stringify(results, null, 2));
      } catch (error) {
        return toolResult(
          `Error fetching DNS views: ${error}`,
          true,
        );
      }
    },
  );

  // ── Manage Extensible Attributes ────────────────────────────────────
  server.tool(
    "get_extensible_attribute_definitions",
    "List extensible attribute definitions configured in Infoblox. Extensible attributes are custom metadata fields.",
    {
      name: z
        .string()
        .optional()
        .describe("Attribute name to search for"),
    },
    async ({ name }) => {
      const params: Record<string, string> = {
        _return_fields:
          "name,comment,type,default_value,list_values,flags",
      };
      if (name) params.name = name;

      try {
        const results = await client.get(
          "extensibleattributedef",
          params,
        );
        return toolResult(JSON.stringify(results, null, 2));
      } catch (error) {
        return toolResult(
          `Error fetching extensible attributes: ${error}`,
          true,
        );
      }
    },
  );
}
