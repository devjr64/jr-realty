import { NextRequest, NextResponse } from 'next/server'
import { validateMcpApiKey, McpAuthenticationError, McpAuthorizationError } from './lib/auth'
import { createErrorResponse, MCP_ERROR_CODES } from './lib/formatters'

/**
 * Main MCP endpoint - HTTP+SSE transport
 * This is the entry point for remote MCP connections
 */
export async function GET(request: NextRequest) {
  try {
    // Validate API key
    await validateMcpApiKey(request)

    // Return MCP server info
    return NextResponse.json({
      name: 'JR Realty MCP Server',
      version: '1.0.0',
      capabilities: {
        tools: {},
      },
      endpoints: {
        properties: '/api/mcp/properties',
        users: '/api/mcp/users',
        agents: '/api/mcp/agents',
        zones: '/api/mcp/zones',
        enums: '/api/mcp/enums/[type]',
        utils: {
          parseProperty: '/api/mcp/utils/parse-property',
        },
      },
    })
  } catch (error) {
    if (error instanceof McpAuthenticationError) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.AUTHENTICATION_ERROR, error.message),
        { status: 401 }
      )
    }

    if (error instanceof McpAuthorizationError) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.AUTHORIZATION_ERROR, error.message),
        { status: 403 }
      )
    }

    return NextResponse.json(
      createErrorResponse(MCP_ERROR_CODES.INTERNAL_ERROR, 'Internal server error'),
      { status: 500 }
    )
  }
}
