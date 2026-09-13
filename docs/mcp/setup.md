# MCP Server Setup Guide

## Overview

The JR Realty MCP Server enables AI agents (opencode, Claude Desktop) to manage properties, users, and agents through natural language interactions.

## Prerequisites

- Node.js 24+
- PostgreSQL 16
- pnpm

## Installation

### 1. Database Migration

The MCP tables are already included in the Prisma schema. Run migrations:

```bash
pnpm run db:migrate
```

This creates:
- `McpApiKey` - API key storage
- `McpAuditLog` - Operation audit logs

### 2. Generate API Key

Create a script to generate API keys or use Prisma Studio:

```typescript
// scripts/generate-mcp-key.ts
import { db } from '@/lib/db'
import { generateMcpApiKey } from '@/app/api/mcp/lib/auth'

async function main() {
  const key = generateMcpApiKey('development')
  
  await db.mcpApiKey.create({
    data: {
      key,
      name: 'Development Key',
      environment: 'development',
      userId: 'YOUR_SUPER_ADMIN_USER_ID',
      active: true,
    },
  })
  
  console.log('Generated API Key:', key)
}

main()
```

Run with:
```bash
pnpm exec tsx scripts/generate-mcp-key.ts
```

### 3. Environment Variables

Add to `.env.local` (development) or `.env.production`:

```bash
# MCP Configuration
MCP_ENABLED=true
MCP_API_KEY=mcp_dev_your_generated_key_here

# App URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
MCP_SERVER_URL=http://localhost:3000/api/mcp
```

### 4. Configure AI Agent

#### opencode

Add to `.opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "jrrealty-dev": {
      "type": "local",
      "command": ["./mcp-server/start.sh"],
      "environment": {
        "MCP_API_KEY": "mcp_dev_your_key_here",
        "MCP_SERVER_URL": "http://localhost:3000/api/mcp"
      },
      "enabled": true
    }
  }
}
```

#### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "jrrealty-dev": {
      "command": "node",
      "args": ["/path/to/jr-realty/mcp-server/index.js"],
      "env": {
        "MCP_API_KEY": "mcp_dev_your_key_here",
        "MCP_SERVER_URL": "http://localhost:3000/api/mcp"
      }
    }
  }
}
```

### 5. Install MCP Server Dependencies

```bash
cd mcp-server
pnpm install
```

### 6. Start Development Server

```bash
pnpm run dev
```

## Testing

Test the MCP server with curl:

```bash
# List properties
curl -H "X-API-Key: mcp_dev_your_key_here" \
  http://localhost:3000/api/mcp/properties

# Create property
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-API-Key: mcp_dev_your_key_here" \
  -d '{
    "title": "Test Property",
    "description": "Test description",
    "type": "APARTMENT",
    "operation": "SALE",
    "price": 360000,
    "address": "Test Address",
    "zoneId": "zone_id_here",
    "agentId": "agent_id_here"
  }' \
  http://localhost:3000/api/mcp/properties
```

## Production Deployment

1. Generate production API key:
```typescript
const key = generateMcpApiKey('production')
```

2. Set environment variables:
```bash
MCP_ENABLED=true
MCP_API_KEY=mcp_prod_your_production_key
MCP_SERVER_URL=https://jrrealty.com.ve/api/mcp
```

3. Deploy to production server

4. Update AI agent configuration with production URL and key

## Security

- API keys are stored hashed in database
- Only SUPER_ADMIN users can use MCP
- All operations are logged in McpAuditLog
- Use HTTPS in production
- Rotate keys periodically

## Troubleshooting

### "Invalid API key" error
- Check API key is correct
- Verify key is active in database
- Check key hasn't expired

### "Only SUPER_ADMIN can access MCP" error
- Verify the user associated with the API key has SUPER_ADMIN role

### Build errors
- Ensure mcp-server is excluded from tsconfig.json
- Check all imports use correct paths

## API Endpoints

- `GET /api/mcp` - Server info
- `GET /api/mcp/properties` - List properties
- `POST /api/mcp/properties` - Create property
- `GET /api/mcp/properties/[idOrSlug]` - Get property
- `PATCH /api/mcp/properties/[idOrSlug]` - Update property
- `DELETE /api/mcp/properties/[idOrSlug]` - Delete property
- `GET /api/mcp/users` - List users
- `POST /api/mcp/users` - Create user
- `GET /api/mcp/users/[idOrEmail]` - Get user
- `PATCH /api/mcp/users/[idOrEmail]` - Update user
- `DELETE /api/mcp/users/[idOrEmail]` - Delete user
- `GET /api/mcp/agents` - List agents
- `POST /api/mcp/agents` - Create agent
- `GET /api/mcp/agents/[idOrUserId]` - Get agent
- `PATCH /api/mcp/agents/[idOrUserId]` - Update agent
- `DELETE /api/mcp/agents/[idOrUserId]` - Delete agent
- `GET /api/mcp/zones` - List zones
- `GET /api/mcp/enums/[type]` - List enum values
- `POST /api/mcp/utils/parse-property` - Parse property document

## MCP Tools (18 total)

### Property Tools (5)
- `create_property`
- `list_properties`
- `get_property`
- `update_property`
- `delete_property`

### User Tools (5)
- `create_user`
- `list_users`
- `get_user`
- `update_user`
- `delete_user`

### Agent Tools (5)
- `create_agent`
- `list_agents`
- `get_agent`
- `update_agent`
- `delete_agent`

### Utility Tools (3)
- `parse_property_document`
- `list_zones`
- `list_enums`
