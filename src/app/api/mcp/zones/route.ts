import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateMcpApiKey, McpAuthenticationError, McpAuthorizationError } from '../lib/auth'
import { createAuditLogger } from '../lib/audit'
import { createSuccessResponse, createErrorResponse, MCP_ERROR_CODES } from '../lib/formatters'

export async function GET(request: NextRequest) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const { searchParams } = new URL(request.url)
    const parentId = searchParams.get('parentId')

    const where: Record<string, unknown> = {}
    if (parentId) where.parentId = parentId

    const zones = await db.zone.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        parent: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    })

    await audit.log('list_zones', undefined, true)

    return NextResponse.json(
      createSuccessResponse(
        { zones },
        {
          message: `Found ${zones.length} zones`,
          humanReadable: `📍 Found ${zones.length} zones`,
        }
      )
    )
  } catch (error) {
    return handleError(error, 'list_zones')
  }
}

function handleError(error: unknown, operation: string) {
  console.error(`MCP ${operation} error:`, error)

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
