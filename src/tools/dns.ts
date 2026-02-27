import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { InfobloxClient } from "../infoblox-client.js";

const RECORD_TYPES = [
  "record:a",
  "record:aaaa",
  "record:cname",
  "record:host",
  "record:ptr",
  "record:mx",
  "record:txt",
  "record:srv",
] as const;

const DEFAULT_RETURN_FIELDS: Record<string, string> = {
  "record:a": "name,ipv4addr,view,ttl,comment,zone,disable",
  "record:aaaa": "name,ipv6addr,view,ttl,comment,zone,disable",
  "record:cname": "name,canonical,view,ttl,comment,zone,disable",
  "record:host":
    "name,ipv4addrs,ipv6addrs,view,ttl,comment,zone,aliases,configure_for_dns,disable",
  "record:ptr": "ptrdname,ipv4addr,ipv6addr,view,ttl,comment,zone,disable",
  "record:mx":
    "name,mail_exchanger,preference,view,ttl,comment,zone,disable",
  "record:txt": "name,text,view,ttl,comment,zone,disable",
  "record:srv":
    "name,target,port,priority,weight,view,ttl,comment,zone,disable",
};

function toolResult(text: string, isError = false) {
  return { content: [{ type: "text" as const, text }], isError };
}

export function registerDnsTools(
  server: McpServer,
  client: InfobloxClient,
) {
  // ── Search DNS Records ──────────────────────────────────────────────
  server.tool(
    "search_dns_records",
    "Search for DNS records in Infoblox. Supports A, AAAA, CNAME, Host, PTR, MX, TXT, SRV records. Name search uses regex by default.",
    {
      record_type: z
        .enum(RECORD_TYPES)
        .describe("Type of DNS record to search for"),
      name: z
        .string()
        .optional()
        .describe(
          "Record name (FQDN) — uses regex search, e.g. 'host' matches 'host.example.com'",
        ),
      zone: z.string().optional().describe("DNS zone to filter by"),
      view: z.string().optional().describe("DNS view to filter by"),
      ip_address: z
        .string()
        .optional()
        .describe("IP address to search for (A/AAAA/Host records)"),
      max_results: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum number of results to return"),
      return_fields: z
        .string()
        .optional()
        .describe("Comma-separated list of additional fields to return"),
    },
    async ({
      record_type,
      name,
      zone,
      view,
      ip_address,
      max_results,
      return_fields,
    }) => {
      const params: Record<string, string> = {
        _max_results: String(max_results),
        _return_fields:
          return_fields || DEFAULT_RETURN_FIELDS[record_type] || "",
      };

      if (name) params["name~"] = name;
      if (zone) params.zone = zone;
      if (view) params.view = view;
      if (ip_address) {
        if (
          record_type === "record:a" ||
          record_type === "record:host"
        ) {
          params.ipv4addr = ip_address;
        } else if (record_type === "record:aaaa") {
          params.ipv6addr = ip_address;
        }
      }

      try {
        const results = await client.get(record_type, params);
        return toolResult(JSON.stringify(results, null, 2));
      } catch (error) {
        return toolResult(`Error searching records: ${error}`, true);
      }
    },
  );

  // ── Get All Records in Zone ─────────────────────────────────────────
  server.tool(
    "get_all_records_in_zone",
    "List all DNS records in a specific zone. Returns all record types in the zone.",
    {
      zone: z.string().describe("DNS zone name (FQDN)"),
      view: z.string().optional().describe("DNS view"),
      record_type: z
        .string()
        .optional()
        .describe(
          "Filter by record type: A, AAAA, CNAME, MX, PTR, SRV, TXT, HOST, etc.",
        ),
      max_results: z
        .number()
        .optional()
        .default(500)
        .describe("Maximum number of results"),
    },
    async ({ zone, view, record_type, max_results }) => {
      const params: Record<string, string> = {
        zone: zone,
        _max_results: String(max_results),
        _return_fields: "name,type,address,comment,zone,view",
      };
      if (view) params.view = view;
      if (record_type) params.type = record_type;

      try {
        const results = await client.get("allrecords", params);
        return toolResult(JSON.stringify(results, null, 2));
      } catch (error) {
        return toolResult(
          `Error fetching zone records: ${error}`,
          true,
        );
      }
    },
  );

  // ── Create A Record ─────────────────────────────────────────────────
  server.tool(
    "create_a_record",
    "Create a DNS A record in Infoblox",
    {
      name: z
        .string()
        .describe("FQDN for the A record (e.g., host.example.com)"),
      ipv4addr: z.string().describe("IPv4 address for the record"),
      view: z
        .string()
        .optional()
        .describe("DNS view (defaults to 'default')"),
      ttl: z.number().optional().describe("TTL in seconds"),
      comment: z.string().optional().describe("Comment for the record"),
      disable: z
        .boolean()
        .optional()
        .default(false)
        .describe("Create in disabled state"),
    },
    async ({ name, ipv4addr, view, ttl, comment, disable }) => {
      const data: Record<string, unknown> = { name, ipv4addr };
      if (view) data.view = view;
      if (ttl !== undefined) {
        data.ttl = ttl;
        data.use_ttl = true;
      }
      if (comment) data.comment = comment;
      if (disable) data.disable = disable;

      try {
        const ref = await client.create("record:a", data);
        return toolResult(`A record created successfully.\nReference: ${ref}`);
      } catch (error) {
        return toolResult(`Error creating A record: ${error}`, true);
      }
    },
  );

  // ── Create AAAA Record ──────────────────────────────────────────────
  server.tool(
    "create_aaaa_record",
    "Create a DNS AAAA (IPv6) record in Infoblox",
    {
      name: z.string().describe("FQDN for the AAAA record"),
      ipv6addr: z.string().describe("IPv6 address for the record"),
      view: z.string().optional().describe("DNS view"),
      ttl: z.number().optional().describe("TTL in seconds"),
      comment: z.string().optional().describe("Comment for the record"),
    },
    async ({ name, ipv6addr, view, ttl, comment }) => {
      const data: Record<string, unknown> = { name, ipv6addr };
      if (view) data.view = view;
      if (ttl !== undefined) {
        data.ttl = ttl;
        data.use_ttl = true;
      }
      if (comment) data.comment = comment;

      try {
        const ref = await client.create("record:aaaa", data);
        return toolResult(
          `AAAA record created successfully.\nReference: ${ref}`,
        );
      } catch (error) {
        return toolResult(
          `Error creating AAAA record: ${error}`,
          true,
        );
      }
    },
  );

  // ── Create CNAME Record ─────────────────────────────────────────────
  server.tool(
    "create_cname_record",
    "Create a DNS CNAME record in Infoblox",
    {
      name: z
        .string()
        .describe("Alias FQDN for the CNAME record"),
      canonical: z
        .string()
        .describe("Canonical name (target FQDN)"),
      view: z.string().optional().describe("DNS view"),
      ttl: z.number().optional().describe("TTL in seconds"),
      comment: z.string().optional().describe("Comment for the record"),
    },
    async ({ name, canonical, view, ttl, comment }) => {
      const data: Record<string, unknown> = { name, canonical };
      if (view) data.view = view;
      if (ttl !== undefined) {
        data.ttl = ttl;
        data.use_ttl = true;
      }
      if (comment) data.comment = comment;

      try {
        const ref = await client.create("record:cname", data);
        return toolResult(
          `CNAME record created successfully.\nReference: ${ref}`,
        );
      } catch (error) {
        return toolResult(
          `Error creating CNAME record: ${error}`,
          true,
        );
      }
    },
  );

  // ── Create Host Record ──────────────────────────────────────────────
  server.tool(
    "create_host_record",
    "Create a DNS Host record in Infoblox. Host records combine A and PTR records. Use 'func:nextavailableip:<network_ref>' as ipv4addr to auto-assign the next available IP.",
    {
      name: z.string().describe("FQDN for the host record"),
      ipv4addrs: z
        .array(
          z.object({
            ipv4addr: z
              .string()
              .describe(
                "IPv4 address, or 'func:nextavailableip:<network_ref>' for auto-assign",
              ),
            mac: z
              .string()
              .optional()
              .describe("MAC address for DHCP"),
            configure_for_dhcp: z
              .boolean()
              .optional()
              .describe("Enable DHCP for this address"),
          }),
        )
        .optional()
        .describe("IPv4 addresses for the host"),
      ipv6addrs: z
        .array(
          z.object({
            ipv6addr: z.string().describe("IPv6 address"),
          }),
        )
        .optional()
        .describe("IPv6 addresses for the host"),
      view: z.string().optional().describe("DNS view"),
      ttl: z.number().optional().describe("TTL in seconds"),
      comment: z.string().optional().describe("Comment for the record"),
      configure_for_dns: z
        .boolean()
        .optional()
        .default(true)
        .describe("Configure for DNS"),
    },
    async ({
      name,
      ipv4addrs,
      ipv6addrs,
      view,
      ttl,
      comment,
      configure_for_dns,
    }) => {
      const data: Record<string, unknown> = { name };
      if (ipv4addrs) data.ipv4addrs = ipv4addrs;
      if (ipv6addrs) data.ipv6addrs = ipv6addrs;
      if (view) data.view = view;
      if (ttl !== undefined) {
        data.ttl = ttl;
        data.use_ttl = true;
      }
      if (comment) data.comment = comment;
      if (configure_for_dns !== undefined)
        data.configure_for_dns = configure_for_dns;

      try {
        const ref = await client.create("record:host", data);
        return toolResult(
          `Host record created successfully.\nReference: ${ref}`,
        );
      } catch (error) {
        return toolResult(
          `Error creating host record: ${error}`,
          true,
        );
      }
    },
  );

  // ── Create PTR Record ───────────────────────────────────────────────
  server.tool(
    "create_ptr_record",
    "Create a DNS PTR (reverse) record in Infoblox",
    {
      ptrdname: z
        .string()
        .describe("Domain name the PTR points to (FQDN)"),
      ipv4addr: z
        .string()
        .optional()
        .describe("IPv4 address for the PTR record"),
      ipv6addr: z
        .string()
        .optional()
        .describe("IPv6 address for the PTR record"),
      name: z
        .string()
        .optional()
        .describe(
          "PTR record name in reverse DNS format (e.g., 1.0.168.192.in-addr.arpa)",
        ),
      view: z.string().optional().describe("DNS view"),
      ttl: z.number().optional().describe("TTL in seconds"),
      comment: z.string().optional().describe("Comment for the record"),
    },
    async ({ ptrdname, ipv4addr, ipv6addr, name, view, ttl, comment }) => {
      const data: Record<string, unknown> = { ptrdname };
      if (ipv4addr) data.ipv4addr = ipv4addr;
      if (ipv6addr) data.ipv6addr = ipv6addr;
      if (name) data.name = name;
      if (view) data.view = view;
      if (ttl !== undefined) {
        data.ttl = ttl;
        data.use_ttl = true;
      }
      if (comment) data.comment = comment;

      try {
        const ref = await client.create("record:ptr", data);
        return toolResult(
          `PTR record created successfully.\nReference: ${ref}`,
        );
      } catch (error) {
        return toolResult(
          `Error creating PTR record: ${error}`,
          true,
        );
      }
    },
  );

  // ── Create MX Record ───────────────────────────────────────────────
  server.tool(
    "create_mx_record",
    "Create a DNS MX (mail exchange) record in Infoblox",
    {
      name: z
        .string()
        .describe("FQDN for the MX record (usually the domain)"),
      mail_exchanger: z
        .string()
        .describe("FQDN of the mail server"),
      preference: z.number().describe("MX preference/priority value"),
      view: z.string().optional().describe("DNS view"),
      ttl: z.number().optional().describe("TTL in seconds"),
      comment: z.string().optional().describe("Comment for the record"),
    },
    async ({
      name,
      mail_exchanger,
      preference,
      view,
      ttl,
      comment,
    }) => {
      const data: Record<string, unknown> = {
        name,
        mail_exchanger,
        preference,
      };
      if (view) data.view = view;
      if (ttl !== undefined) {
        data.ttl = ttl;
        data.use_ttl = true;
      }
      if (comment) data.comment = comment;

      try {
        const ref = await client.create("record:mx", data);
        return toolResult(
          `MX record created successfully.\nReference: ${ref}`,
        );
      } catch (error) {
        return toolResult(
          `Error creating MX record: ${error}`,
          true,
        );
      }
    },
  );

  // ── Create TXT Record ──────────────────────────────────────────────
  server.tool(
    "create_txt_record",
    "Create a DNS TXT record in Infoblox",
    {
      name: z.string().describe("FQDN for the TXT record"),
      text: z.string().describe("Text content of the record"),
      view: z.string().optional().describe("DNS view"),
      ttl: z.number().optional().describe("TTL in seconds"),
      comment: z.string().optional().describe("Comment for the record"),
    },
    async ({ name, text, view, ttl, comment }) => {
      const data: Record<string, unknown> = { name, text };
      if (view) data.view = view;
      if (ttl !== undefined) {
        data.ttl = ttl;
        data.use_ttl = true;
      }
      if (comment) data.comment = comment;

      try {
        const ref = await client.create("record:txt", data);
        return toolResult(
          `TXT record created successfully.\nReference: ${ref}`,
        );
      } catch (error) {
        return toolResult(
          `Error creating TXT record: ${error}`,
          true,
        );
      }
    },
  );

  // ── Create SRV Record ──────────────────────────────────────────────
  server.tool(
    "create_srv_record",
    "Create a DNS SRV record in Infoblox",
    {
      name: z
        .string()
        .describe(
          "SRV record name in format _service._proto.name (e.g., _sip._tcp.example.com)",
        ),
      target: z.string().describe("Target host FQDN"),
      port: z.number().describe("Port number"),
      priority: z.number().describe("Priority value (lower = higher priority)"),
      weight: z.number().describe("Weight for load balancing"),
      view: z.string().optional().describe("DNS view"),
      ttl: z.number().optional().describe("TTL in seconds"),
      comment: z.string().optional().describe("Comment for the record"),
    },
    async ({
      name,
      target,
      port,
      priority,
      weight,
      view,
      ttl,
      comment,
    }) => {
      const data: Record<string, unknown> = {
        name,
        target,
        port,
        priority,
        weight,
      };
      if (view) data.view = view;
      if (ttl !== undefined) {
        data.ttl = ttl;
        data.use_ttl = true;
      }
      if (comment) data.comment = comment;

      try {
        const ref = await client.create("record:srv", data);
        return toolResult(
          `SRV record created successfully.\nReference: ${ref}`,
        );
      } catch (error) {
        return toolResult(
          `Error creating SRV record: ${error}`,
          true,
        );
      }
    },
  );

  // ── Update DNS Record ──────────────────────────────────────────────
  server.tool(
    "update_dns_record",
    "Update an existing DNS record by its object reference. Get the reference from a search first.",
    {
      ref: z
        .string()
        .describe(
          "Object reference of the record to update (e.g., record:a/ZG5z...)",
        ),
      fields: z
        .record(z.unknown())
        .describe(
          "Fields to update as key-value pairs (e.g., { ipv4addr: '10.0.0.1', comment: 'updated' })",
        ),
    },
    async ({ ref, fields }) => {
      try {
        const result = await client.update(ref, fields);
        return toolResult(
          `Record updated successfully.\nReference: ${result}`,
        );
      } catch (error) {
        return toolResult(`Error updating record: ${error}`, true);
      }
    },
  );

  // ── Delete DNS Record ──────────────────────────────────────────────
  server.tool(
    "delete_dns_record",
    "Delete a DNS record by its object reference. Get the reference from a search first.",
    {
      ref: z
        .string()
        .describe(
          "Object reference of the record to delete (e.g., record:a/ZG5z...)",
        ),
    },
    async ({ ref }) => {
      try {
        const result = await client.delete(ref);
        return toolResult(
          `Record deleted successfully.\nReference: ${result}`,
        );
      } catch (error) {
        return toolResult(`Error deleting record: ${error}`, true);
      }
    },
  );
}
