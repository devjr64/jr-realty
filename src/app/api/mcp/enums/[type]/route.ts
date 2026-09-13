import { NextRequest, NextResponse } from 'next/server'
import { validateMcpApiKey, McpAuthenticationError, McpAuthorizationError } from '../../lib/auth'
import { createAuditLogger } from '../../lib/audit'
import { createSuccessResponse, createErrorResponse, MCP_ERROR_CODES } from '../../lib/formatters'

const ENUMS = {
  PropertyType: [
    'APARTMENT',
    'HOUSE',
    'PENTHOUSE',
    'OFFICE',
    'COMMERCIAL',
    'WAREHOUSE',
    'LAND',
    'FARM',
    'BUILDING',
    'CONSULTING_ROOM',
    'TOWNHOUSE',
    'BEACH_HOUSE',
    'PARKING',
  ],
  OperationType: ['SALE', 'RENT', 'BOTH'],
  Currency: ['USD', 'VES'],
  PropertyStatus: ['AVAILABLE', 'SOLD', 'RENTED', 'RESERVED', 'INACTIVE'],
  Tag: ['FURNISHED', 'REPOSSESSED', 'OPPORTUNITY', 'NEW_CONSTRUCTION', 'PREMIUM', 'PET_FRIENDLY'],
  Role: ['SUPER_ADMIN', 'AGENT', 'CLIENT'],
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const { type } = await params

    if (!(type in ENUMS)) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.NOT_FOUND, `Enum type '${type}' not found`, {
          validTypes: Object.keys(ENUMS).join(', '),
        }),
        { status: 404 }
      )
    }

    await audit.log('list_enums', undefined, true)

    return NextResponse.json(
      createSuccessResponse(
        {
          type,
          values: ENUMS[type as keyof typeof ENUMS],
        },
        {
          message: `Found ${ENUMS[type as keyof typeof ENUMS].length} values for ${type}`,
          humanReadable: `📋 ${type}: ${ENUMS[type as keyof typeof ENUMS].join(', ')}`,
        }
      )
    )
  } catch (error) {
    return handleError(error, 'list_enums')
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
