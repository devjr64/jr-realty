import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { validateMcpApiKey, McpAuthenticationError, McpAuthorizationError } from '../lib/auth'
import { createAuditLogger } from '../lib/audit'
import {
  createSuccessResponse,
  createErrorResponse,
  MCP_ERROR_CODES,
  formatUser,
  formatPagination,
} from '../lib/formatters'

export async function GET(request: NextRequest) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')
    const role = searchParams.get('role')
    const active = searchParams.get('active')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (role) where.role = role
    if (active) where.active = active === 'true'
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      db.user.findMany({ where, take: limit, skip: offset, orderBy: { createdAt: 'desc' } }),
      db.user.count({ where }),
    ])

    await audit.log('list_users', undefined, true)

    return NextResponse.json(
      createSuccessResponse(
        {
          users: users.map(formatUser),
          pagination: formatPagination(total, limit, offset),
        },
        {
          message: `Found ${total} users`,
          humanReadable: `📊 Found ${total} users`,
        }
      )
    )
  } catch (error) {
    return handleError(error, 'list_users')
  }
}

export async function POST(request: NextRequest) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const body = await request.json()

    const requiredFields = ['name', 'email', 'password', 'role']
    const missingFields = requiredFields.filter((field) => !body[field])
    if (missingFields.length > 0) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.VALIDATION_ERROR, 'Missing required fields', {
          fields: missingFields.join(', '),
        }),
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { email: body.email } })
    if (existing) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.CONFLICT, 'User with this email already exists'),
        { status: 409 }
      )
    }

    const passwordHash = await bcrypt.hash(body.password, 12)

    const user = await db.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        role: body.role,
        phone: body.phone,
        active: body.active ?? true,
      },
    })

    await audit.log('create_user', user.id, true)

    return NextResponse.json(
      createSuccessResponse(formatUser(user), {
        id: user.id,
        message: 'User created successfully',
        humanReadable: `✅ User '${user.name}' created with ID: ${user.id}`,
      }),
      { status: 201 }
    )
  } catch (error) {
    return handleError(error, 'create_user')
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
