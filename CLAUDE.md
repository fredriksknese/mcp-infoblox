# mcp-infoblox

MCP server for Infoblox NIOS WAPI (DNS, DHCP, IPAM management).

## Build & Run

```bash
npm install
npm run build    # tsc → dist/
npm start        # node dist/index.js (requires env vars)
npm run dev      # tsx src/index.ts (dev mode)
```

## Required Environment Variables

- `INFOBLOX_HOST` — Infoblox server hostname/IP
- `INFOBLOX_USERNAME` — WAPI username
- `INFOBLOX_PASSWORD` — WAPI password
- `INFOBLOX_WAPI_VERSION` — WAPI version (default: `2.12`)
- `INFOBLOX_ALLOW_SELF_SIGNED` — Allow self-signed certs (default: `true`)

## Claude Desktop Configuration

```json
{
  "mcpServers": {
    "infoblox": {
      "command": "node",
      "args": ["/path/to/mcp-infoblox/dist/index.js"],
      "env": {
        "INFOBLOX_HOST": "172.22.224.10",
        "INFOBLOX_USERNAME": "admin",
        "INFOBLOX_PASSWORD": "infoblox"
      }
    }
  }
}
```

## Architecture

- `src/index.ts` — Entry point, creates McpServer + StdioServerTransport
- `src/infoblox-client.ts` — HTTP client wrapping Infoblox WAPI (Basic auth, JSON, self-signed cert support)
- `src/tools/dns.ts` — DNS record tools (search, create A/AAAA/CNAME/Host/PTR/MX/TXT/SRV, update, delete)
- `src/tools/network.ts` — IPAM tools (networks, next available IP, IP search)
- `src/tools/dhcp.ts` — DHCP tools (fixed addresses, leases, ranges)
- `src/tools/zone.ts` — DNS zone tools (list, create, delete)
- `src/tools/grid.ts` — Grid tools (info, members, restart, global search, views, extensible attrs)

## Key Patterns

- Tools use Zod schemas for input validation
- Never `console.log()` in STDIO mode — use `console.error()` for logging
- WAPI search uses `~` suffix for regex (e.g., `name~=pattern`)
- Object references (`_ref`) are used for update/delete/function calls
