#!/usr/bin/env node
/**
 * JR Realty - MCP Server
 * 
 * This is the entry point for the stdio transport MCP server.
 * It connects to the Next.js API routes via HTTP to perform operations.
 * 
 * Usage:
 *   node index.ts (with tsx)
 *   or: tsx index.ts
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

// Configuration from environment
const MCP_API_URL = process.env.MCP_SERVER_URL || 'http://localhost:3000/api/mcp'
const MCP_API_KEY = process.env.MCP_API_KEY

if (!MCP_API_KEY) {
  console.error('Error: MCP_API_KEY environment variable is required')
  process.exit(1)
}

/**
 * Makes an HTTP request to the MCP API
 */
async function makeApiRequest(
  endpoint: string,
  method: string = 'GET',
  body?: unknown
): Promise<unknown> {
  const url = `${MCP_API_URL}${endpoint}`
  
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': MCP_API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}: ${response.statusText}`)
  }

  return data
}

/**
 * Tool definitions for the MCP server
 */
const TOOLS = [
  // Property tools
  {
    name: 'create_property',
    description: 'Create a new property listing',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Property title' },
        description: { type: 'string', description: 'Property description' },
        type: { type: 'string', description: 'Property type (APARTMENT, HOUSE, etc.)' },
        operation: { type: 'string', description: 'Operation type (SALE, RENT, BOTH)' },
        price: { type: 'number', description: 'Property price' },
        currency: { type: 'string', description: 'Currency (USD, VES)', default: 'USD' },
        bedrooms: { type: 'number', description: 'Number of bedrooms' },
        bathrooms: { type: 'number', description: 'Number of bathrooms' },
        buildAreaM2: { type: 'number', description: 'Build area in square meters' },
        address: { type: 'string', description: 'Property address' },
        zoneId: { type: 'string', description: 'Zone ID' },
        agentId: { type: 'string', description: 'Agent ID' },
        features: { type: 'array', items: { type: 'string' }, description: 'Property features' },
      },
      required: ['title', 'description', 'type', 'operation', 'price', 'address', 'zoneId', 'agentId'],
    },
  },
  {
    name: 'list_properties',
    description: 'List properties with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of results', default: 50 },
        offset: { type: 'number', description: 'Offset for pagination', default: 0 },
        status: { type: 'string', description: 'Filter by status' },
        type: { type: 'string', description: 'Filter by type' },
        operation: { type: 'string', description: 'Filter by operation' },
        agentId: { type: 'string', description: 'Filter by agent ID' },
        zoneId: { type: 'string', description: 'Filter by zone ID' },
        search: { type: 'string', description: 'Search in title, description, address' },
      },
    },
  },
  {
    name: 'get_property',
    description: 'Get detailed property information',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Property ID' },
        slug: { type: 'string', description: 'Property slug' },
      },
    },
  },
  {
    name: 'update_property',
    description: 'Update an existing property',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Property ID' },
        title: { type: 'string' },
        description: { type: 'string' },
        price: { type: 'number' },
        status: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_property',
    description: 'Delete a property',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Property ID' },
        confirm: { type: 'boolean', description: 'Confirmation flag', default: false },
      },
      required: ['id', 'confirm'],
    },
  },
  // User tools
  {
    name: 'create_user',
    description: 'Create a new user',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string' },
        password: { type: 'string' },
        role: { type: 'string', description: 'SUPER_ADMIN, AGENT, or CLIENT' },
        phone: { type: 'string' },
      },
      required: ['name', 'email', 'password', 'role'],
    },
  },
  {
    name: 'list_users',
    description: 'List users with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 50 },
        offset: { type: 'number', default: 0 },
        role: { type: 'string' },
        active: { type: 'boolean' },
        search: { type: 'string' },
      },
    },
  },
  {
    name: 'get_user',
    description: 'Get user details',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' },
      },
    },
  },
  {
    name: 'update_user',
    description: 'Update a user',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        active: { type: 'boolean' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_user',
    description: 'Delete a user',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        confirm: { type: 'boolean', default: false },
      },
      required: ['id', 'confirm'],
    },
  },
  // Agent tools
  {
    name: 'create_agent',
    description: 'Create a new agent (requires existing user with AGENT role)',
    inputSchema: {
      type: 'object',
      properties: {
        userId: { type: 'string', description: 'Existing user ID' },
        title: { type: 'string' },
        phone: { type: 'string' },
        whatsapp: { type: 'string' },
      },
      required: ['userId', 'phone'],
    },
  },
  {
    name: 'list_agents',
    description: 'List agents',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 50 },
        offset: { type: 'number', default: 0 },
        active: { type: 'boolean' },
        search: { type: 'string' },
      },
    },
  },
  {
    name: 'get_agent',
    description: 'Get agent details',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        userId: { type: 'string' },
      },
    },
  },
  {
    name: 'update_agent',
    description: 'Update an agent',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        phone: { type: 'string' },
        whatsapp: { type: 'string' },
        active: { type: 'boolean' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_agent',
    description: 'Delete an agent',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        confirm: { type: 'boolean', default: false },
      },
      required: ['id', 'confirm'],
    },
  },
  // Utility tools
  {
    name: 'parse_property_document',
    description: 'Parse property data from Word document or plain text',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Raw text content' },
        format: { type: 'string', description: 'Format: word, text, or markdown', default: 'text' },
      },
      required: ['content'],
    },
  },
  {
    name: 'list_zones',
    description: 'List available zones',
    inputSchema: {
      type: 'object',
      properties: {
        parentId: { type: 'string', description: 'Filter by parent zone ID' },
      },
    },
  },
  {
    name: 'list_enums',
    description: 'List available enum values',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          description: 'Enum type: PropertyType, OperationType, Currency, PropertyStatus, Tag, Role',
        },
      },
      required: ['type'],
    },
  },
]

/**
 * Creates and starts the MCP server
 */
async function main() {
  const server = new Server(
    {
      name: 'jrrealty-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  )

  // Handle list tools request
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS }
  })

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      // Route to appropriate API endpoint
      let endpoint = ''
      let method = 'GET'
      let body: unknown = undefined

      switch (name) {
        // Property tools
        case 'create_property':
          endpoint = '/properties'
          method = 'POST'
          body = args
          break
        case 'list_properties':
          endpoint = '/properties?' + new URLSearchParams(args as Record<string, string>).toString()
          break
        case 'get_property':
          endpoint = `/properties/${args?.id || args?.slug}`
          break
        case 'update_property':
          endpoint = `/properties/${args?.id}`
          method = 'PATCH'
          body = args
          break
        case 'delete_property':
          endpoint = `/properties/${args?.id}`
          method = 'DELETE'
          body = { confirm: args?.confirm }
          break

        // User tools
        case 'create_user':
          endpoint = '/users'
          method = 'POST'
          body = args
          break
        case 'list_users':
          endpoint = '/users?' + new URLSearchParams(args as Record<string, string>).toString()
          break
        case 'get_user':
          endpoint = `/users/${args?.id || args?.email}`
          break
        case 'update_user':
          endpoint = `/users/${args?.id}`
          method = 'PATCH'
          body = args
          break
        case 'delete_user':
          endpoint = `/users/${args?.id}`
          method = 'DELETE'
          body = { confirm: args?.confirm }
          break

        // Agent tools
        case 'create_agent':
          endpoint = '/agents'
          method = 'POST'
          body = args
          break
        case 'list_agents':
          endpoint = '/agents?' + new URLSearchParams(args as Record<string, string>).toString()
          break
        case 'get_agent':
          endpoint = `/agents/${args?.id || args?.userId}`
          break
        case 'update_agent':
          endpoint = `/agents/${args?.id}`
          method = 'PATCH'
          body = args
          break
        case 'delete_agent':
          endpoint = `/agents/${args?.id}`
          method = 'DELETE'
          body = { confirm: args?.confirm }
          break

        // Utility tools
        case 'parse_property_document':
          endpoint = '/utils/parse-property'
          method = 'POST'
          body = args
          break
        case 'list_zones':
          endpoint = '/zones?' + new URLSearchParams(args as Record<string, string>).toString()
          break
        case 'list_enums':
          endpoint = `/enums/${args?.type}`
          break

        default:
          throw new Error(`Unknown tool: ${name}`)
      }

      const result = await makeApiRequest(endpoint, method, body)

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: {
                code: 'TOOL_EXECUTION_ERROR',
                message: errorMessage,
              },
            }, null, 2),
          },
        ],
        isError: true,
      }
    }
  })

  // Connect to stdio transport
  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error('JR Realty MCP Server running on stdio')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
