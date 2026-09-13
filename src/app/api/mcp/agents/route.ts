import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateMcpApiKey, McpAuthenticationError, McpAuthorizationError } from '../lib/auth'
import { createAuditLogger } from '../lib/audit'
import {
  createSuccessResponse,
  createErrorResponse,
  MCP_ERROR_CODES,
  formatAgent,
  formatPagination,
} from '../lib/formatters'

export async function GET(request: NextRequest) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')
    const active = searchParams.get('active')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (active) where.active = active === 'true'
    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    }

    const [agents, total] = await Promise.all([
      db.agent.findMany({
        where,
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { properties: true } },
        },
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      db.agent.count({ where }),
    ])

    await audit.log('list_agents', undefined, true)

    return NextResponse.json(
      createSuccessResponse(
        {
          agents: agents.map(formatAgent),
          pagination: formatPagination(total, limit, offset),
        },
        {
          message: `Found ${total} agents`,
          humanReadable: `📊 Found ${total} agents`,
        }
      )
    )
  } catch (error) {
    return handleError(error, 'list_agents')
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const body = await request.json()

    if (!body.userId || !body.phone) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.VALIDATION_ERROR, 'Missing required fields', {
          fields: 'userId, phone',
        }),
        { status: 400 }
      )
    }

    const user = await db.user.findUnique({ where: { id: body.userId } })
    if (!user) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.NOT_FOUND, 'User not found'),
        { status: 404 }
      )
    }

    if (user.role !== 'AGENT') {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.VALIDATION_ERROR, 'User must have AGENT role'),
        { status: 400 }
      )
    }

    const existingAgent = await db.agent.findUnique({ where: { userId: body.userId } })
    if (existingAgent) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.CONFLICT, 'User is already an agent'),
        { status: 409 }
      )
    }

    const agent = await db.agent.create({
      data: {
        userId: body.userId,
        title: body.title,
        phone: body.phone,
        whatsapp: body.whatsapp,
        active: body.active ?? true,
      },
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { properties: true } },
      },
    })

    await audit.log('create_agent', agent.id, true)

    return NextResponse.json(
      createSuccessResponse(formatAgent(agent), {
        id: agent.id,
        message: 'Agent created successfully',
        humanReadable: `✅ Agent '${agent.user.name}' created`,
      }),
      { status: 201 }
    )
  } catch (error) {
    return handleError(error, 'create_agent')
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
