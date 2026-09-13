import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateMcpApiKey, McpAuthenticationError, McpAuthorizationError } from '../../lib/auth'
import { createAuditLogger } from '../../lib/audit'
import {
  createSuccessResponse,
  createErrorResponse,
  MCP_ERROR_CODES,
  formatUser,
} from '../../lib/formatters'

export async function GET(request: NextRequest, { params }: { params: Promise<{ idOrEmail: string }> }) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const { idOrEmail } = await params

    let user = await db.user.findUnique({ where: { id: idOrEmail } })
    if (!user) {
      user = await db.user.findUnique({ where: { email: idOrEmail } })
    }

    if (!user) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.NOT_FOUND, 'User not found'),
        { status: 404 }
      )
    }

    await audit.log('get_user', user.id, true)

    return NextResponse.json(
      createSuccessResponse(formatUser(user), {
        id: user.id,
        message: 'User retrieved successfully',
        humanReadable: `👤 User: ${user.name} (${user.email})`,
      })
    )
  } catch (error) {
    return handleError(error, 'get_user')
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ idOrEmail: string }> }) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const { idOrEmail } = await params
    const body = await request.json()

    let user = await db.user.findUnique({ where: { id: idOrEmail } })
    if (!user) {
      user = await db.user.findUnique({ where: { email: idOrEmail } })
    }

    if (!user) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.NOT_FOUND, 'User not found'),
        { status: 404 }
      )
    }

    if (body.email && body.email !== user.email) {
      const existing = await db.user.findUnique({ where: { email: body.email } })
      if (existing) {
        return NextResponse.json(
          createErrorResponse(MCP_ERROR_CODES.CONFLICT, 'Email already in use'),
          { status: 409 }
        )
      }
    }

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        name: body.name,
        email: body.email,
        role: body.role,
        phone: body.phone,
        active: body.active,
      },
    })

    await audit.log('update_user', user.id, true)

    return NextResponse.json(
      createSuccessResponse(formatUser(updatedUser), {
        id: updatedUser.id,
        message: 'User updated successfully',
        humanReadable: `✅ User '${updatedUser.name}' updated`,
      })
    )
  } catch (error) {
    return handleError(error, 'update_user')
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ idOrEmail: string }> }) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const { idOrEmail } = await params
    const body = await request.json().catch(() => ({}))

    if (!body.confirm) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.VALIDATION_ERROR, 'Confirmation required'),
        { status: 400 }
      )
    }

    let user = await db.user.findUnique({ where: { id: idOrEmail } })
    if (!user) {
      user = await db.user.findUnique({ where: { email: idOrEmail } })
    }

    if (!user) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.NOT_FOUND, 'User not found'),
        { status: 404 }
      )
    }

    if (user.id === apiKeyData.userId) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.VALIDATION_ERROR, 'Cannot delete yourself'),
        { status: 400 }
      )
    }

    if (user.role === 'SUPER_ADMIN') {
      const superAdminCount = await db.user.count({ where: { role: 'SUPER_ADMIN' } })
      if (superAdminCount <= 1) {
        return NextResponse.json(
          createErrorResponse(MCP_ERROR_CODES.VALIDATION_ERROR, 'Cannot delete last SUPER_ADMIN'),
          { status: 400 }
        )
      }
    }

    await db.user.delete({ where: { id: user.id } })

    await audit.log('delete_user', user.id, true)

    return NextResponse.json(
      createSuccessResponse({ deleted: true }, {
        message: 'User deleted successfully',
        humanReadable: `✅ User '${user.name}' deleted`,
      })
    )
  } catch (error) {
    return handleError(error, 'delete_user')
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
