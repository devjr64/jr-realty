import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateMcpApiKey, McpAuthenticationError, McpAuthorizationError } from '../../lib/auth'
import { createAuditLogger } from '../../lib/audit'
import {
  createSuccessResponse,
  createErrorResponse,
  MCP_ERROR_CODES,
  formatAgent,
} from '../../lib/formatters'

export async function GET(request: NextRequest, { params }: { params: Promise<{ idOrUserId: string }> }) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const { idOrUserId } = await params

    let agent = await db.agent.findUnique({
      where: { id: idOrUserId },
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { properties: true } },
      },
    })

    if (!agent) {
      agent = await db.agent.findUnique({
        where: { userId: idOrUserId },
        include: {
          user: { select: { name: true, email: true } },
          _count: { select: { properties: true } },
        },
      })
    }

    if (!agent) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.NOT_FOUND, 'Agent not found'),
        { status: 404 }
      )
    }

    await audit.log('get_agent', agent.id, true)

    return NextResponse.json(
      createSuccessResponse(formatAgent(agent), {
        id: agent.id,
        message: 'Agent retrieved successfully',
        humanReadable: `👤 Agent: ${agent.user.name}\n🏠 Properties: ${agent._count.properties}`,
      })
    )
  } catch (error) {
    return handleError(error, 'get_agent')
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ idOrUserId: string }> }) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const { idOrUserId } = await params
    const body = await request.json()

    let agent = await db.agent.findUnique({ where: { id: idOrUserId } })
    if (!agent) {
      agent = await db.agent.findUnique({ where: { userId: idOrUserId } })
    }

    if (!agent) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.NOT_FOUND, 'Agent not found'),
        { status: 404 }
      )
    }

    const updatedAgent = await db.agent.update({
      where: { id: agent.id },
      data: {
        title: body.title,
        phone: body.phone,
        whatsapp: body.whatsapp,
        active: body.active,
      },
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { properties: true } },
      },
    })

    await audit.log('update_agent', agent.id, true)

    return NextResponse.json(
      createSuccessResponse(formatAgent(updatedAgent), {
        id: updatedAgent.id,
        message: 'Agent updated successfully',
        humanReadable: `✅ Agent '${updatedAgent.user.name}' updated`,
      })
    )
  } catch (error) {
    return handleError(error, 'update_agent')
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ idOrUserId: string }> }) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const { idOrUserId } = await params
    const body = await request.json().catch(() => ({}))

    if (!body.confirm) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.VALIDATION_ERROR, 'Confirmation required'),
        { status: 400 }
      )
    }

    let agent = await db.agent.findUnique({
      where: { id: idOrUserId },
      include: { _count: { select: { properties: true } } },
    })
    if (!agent) {
      agent = await db.agent.findUnique({
        where: { userId: idOrUserId },
        include: { _count: { select: { properties: true } } },
      })
    }

    if (!agent) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.NOT_FOUND, 'Agent not found'),
        { status: 404 }
      )
    }

    if (agent._count.properties > 0) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.VALIDATION_ERROR, 'Agent has properties assigned', {
          properties: `Agent has ${agent._count.properties} properties. Reassign or delete them first.`,
        }),
        { status: 400 }
      )
    }

    await db.agent.delete({ where: { id: agent.id } })

    await audit.log('delete_agent', agent.id, true)

    return NextResponse.json(
      createSuccessResponse({ deleted: true }, {
        message: 'Agent deleted successfully',
        humanReadable: `✅ Agent deleted`,
      })
    )
  } catch (error) {
    return handleError(error, 'delete_agent')
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
