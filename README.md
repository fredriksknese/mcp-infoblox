# mcp-infoblox

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server for **Infoblox NIOS**, providing AI assistants with full access to DNS, DHCP, and IPAM management through the Infoblox WAPI REST API.

## Features

**35 tools** across five categories:

### DNS Record Management
| Tool | Description |
|------|-------------|
| `search_dns_records` | Search for A, AAAA, CNAME, Host, PTR, MX, TXT, SRV records with regex support |
| `get_all_records_in_zone` | List all DNS records in a specific zone |
| `create_a_record` | Create a DNS A record |
| `create_aaaa_record` | Create a DNS AAAA (IPv6) record |
| `create_cname_record` | Create a DNS CNAME record |
| `create_host_record` | Create a Host record (A + PTR combined), supports next-available-IP |
| `create_ptr_record` | Create a PTR (reverse DNS) record |
| `create_mx_record` | Create a mail exchange record |
| `create_txt_record` | Create a TXT record |
| `create_srv_record` | Create a SRV record |
| `update_dns_record` | Update any DNS record by reference |
| `delete_dns_record` | Delete any DNS record by reference |

### Network & IPAM
| Tool | Description |
|------|-------------|
| `get_networks` | Search and list networks with utilization data |
| `create_network` | Create a network with optional DHCP member and options |
| `delete_network` | Delete a network |
| `get_next_available_ip` | Get next available IP address(es) from a network |
| `search_ip_addresses` | Search IPv4 address space — find used/unused IPs |
| `get_network_details` | Get network details including DHCP utilization stats |

### DHCP
| Tool | Description |
|------|-------------|
| `get_fixed_addresses` | Search DHCP reservations by IP, MAC, or network |
| `create_fixed_address` | Create a DHCP fixed address (reservation) |
| `delete_fixed_address` | Delete a DHCP reservation |
| `get_dhcp_leases` | View active DHCP leases |
| `get_dhcp_ranges` | List DHCP scopes/ranges |
| `create_dhcp_range` | Create a DHCP range |

### DNS Zones
| Tool | Description |
|------|-------------|
| `get_zones` | Search and list authoritative DNS zones |
| `create_zone` | Create a forward or reverse DNS zone |
| `delete_zone` | Delete a DNS zone |

### Grid & Infrastructure
| Tool | Description |
|------|-------------|
| `get_grid_info` | Get grid configuration and status |
| `get_members` | List grid members and their service status |
| `restart_services` | Restart DNS/DHCP services (required after config changes) |
| `get_object_by_ref` | Retrieve any object by its WAPI reference |
| `global_search` | Search across all object types |
| `get_network_views` | List network views |
| `get_dns_views` | List DNS views |
| `get_extensible_attribute_definitions` | List custom extensible attribute definitions |

## Installation

```bash
git clone git@github.com:fredriksknese/mcp-infoblox.git
cd mcp-infoblox
npm install
npm run build
```

## Configuration

The server is configured via environment variables:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `INFOBLOX_HOST` | Yes | — | Infoblox server hostname or IP |
| `INFOBLOX_USERNAME` | Yes | — | WAPI username |
| `INFOBLOX_PASSWORD` | Yes | — | WAPI password |
| `INFOBLOX_WAPI_VERSION` | No | `2.12` | WAPI version |
| `INFOBLOX_ALLOW_SELF_SIGNED` | No | `true` | Accept self-signed SSL certificates |

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "infoblox": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-infoblox/dist/index.js"],
      "env": {
        "INFOBLOX_HOST": "your-infoblox-server.example.com",
        "INFOBLOX_USERNAME": "admin",
        "INFOBLOX_PASSWORD": "your-password"
      }
    }
  }
}
```

## Usage with Claude Code

Add to your Claude Code MCP settings:

```bash
claude mcp add infoblox -- node /absolute/path/to/mcp-infoblox/dist/index.js
```

Set the required environment variables before running, or configure them in your MCP settings.

## Example Prompts

Once connected, you can ask your AI assistant things like:

- *"Show me all A records in the example.com zone"*
- *"Create a host record for server01.example.com with the next available IP in 10.0.1.0/24"*
- *"What DHCP leases are active on the 192.168.1.0/24 network?"*
- *"Find all DNS records pointing to 10.0.0.5"*
- *"Get the next 5 available IPs from the 10.10.0.0/16 network"*
- *"Create a CNAME alias web.example.com pointing to lb.example.com"*
- *"Show me network utilization for all 10.x networks"*
- *"Restart DNS services on the grid"*

## Development

```bash
npm run dev      # Run with tsx (auto-reloads)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled output
```

## Architecture

```
src/
├── index.ts              # Entry point — creates MCP server + STDIO transport
├── infoblox-client.ts    # HTTP client wrapping Infoblox WAPI
└── tools/
    ├── dns.ts            # DNS record CRUD (12 tools)
    ├── network.ts        # Network/IPAM management (6 tools)
    ├── dhcp.ts           # DHCP management (6 tools)
    ├── zone.ts           # DNS zone management (3 tools)
    └── grid.ts           # Grid, search, views, extensible attrs (8 tools)
```

## Requirements

- Node.js 18+
- Infoblox NIOS with WAPI enabled (tested with WAPI v2.12+)

## License

MIT
