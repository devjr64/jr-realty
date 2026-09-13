import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateMcpApiKey, McpAuthenticationError, McpAuthorizationError } from '../lib/auth'
import { createAuditLogger } from '../lib/audit'
import {
  createSuccessResponse,
  createErrorResponse,
  MCP_ERROR_CODES,
  formatProperty,
  formatPagination,
} from '../lib/formatters'
import { slugify } from '@/lib/utils/slugify'

/**
 * GET /api/mcp/properties - List properties
 */
export async function GET(request: NextRequest) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const operation = searchParams.get('operation')
    const agentId = searchParams.get('agentId')
    const zoneId = searchParams.get('zoneId')
    const featured = searchParams.get('featured')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (type) where.type = type
    if (operation) where.operation = operation
    if (agentId) where.agentId = agentId
    if (zoneId) where.zoneId = zoneId
    if (featured) where.featured = featured === 'true'
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [properties, total] = await Promise.all([
      db.property.findMany({
        where,
        include: {
          zone: { select: { id: true, name: true } },
          agent: {
            select: {
              id: true,
              user: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.property.count({ where }),
    ])

    const formattedProperties = properties.map((p) =>
      formatProperty({
        ...p,
        price: parseFloat(p.price.toString()),
        buildAreaM2: p.buildAreaM2 ? parseFloat(p.buildAreaM2.toString()) : null,
        agent: p.agent ? { id: p.agent.id, name: p.agent.user.name } : null,
      })
    )

    await audit.log('list_properties', undefined, true)

    return NextResponse.json(
      createSuccessResponse(
        {
          properties: formattedProperties,
          pagination: formatPagination(total, limit, offset),
        },
        {
          message: `Found ${total} properties`,
          humanReadable: `📊 Found ${total} properties (showing ${offset + 1}-${Math.min(offset + limit, total)})`,
        }
      )
    )
  } catch (error) {
    return handleError(error, 'list_properties')
  }
}

/**
 * POST /api/mcp/properties - Create property
 */
export async function POST(request: NextRequest) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const body = await request.json()

    const requiredFields = ['title', 'description', 'type', 'operation', 'price', 'address', 'zoneId', 'agentId']
    const missingFields = requiredFields.filter((field) => !body[field])
    if (missingFields.length > 0) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.VALIDATION_ERROR, 'Missing required fields', {
          fields: missingFields.join(', '),
        }),
        { status: 400 }
      )
    }

    const zone = await db.zone.findUnique({ where: { id: body.zoneId } })
    if (!zone) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.NOT_FOUND, 'Zone not found', {
          zoneId: `Zone with ID ${body.zoneId} does not exist`,
        }),
        { status: 404 }
      )
    }

    const agent = await db.agent.findUnique({
      where: { id: body.agentId },
      include: { user: true },
    })
    if (!agent) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.NOT_FOUND, 'Agent not found', {
          agentId: `Agent with ID ${body.agentId} does not exist`,
        }),
        { status: 404 }
      )
    }

    const slug = body.slug || (await slugify(body.title))

    const existingProperty = await db.property.findUnique({ where: { slug } })
    if (existingProperty) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.CONFLICT, 'Property with this slug already exists', {
          slug: `Slug "${slug}" is already in use`,
        }),
        { status: 409 }
      )
    }

    const property = await db.property.create({
      data: {
        title: body.title,
        slug,
        description: body.description,
        type: body.type,
        operation: body.operation,
        price: body.price,
        currency: body.currency || 'USD',
        bedrooms: body.bedrooms,
        bathrooms: body.bathrooms,
        halfBathrooms: body.halfBathrooms,
        parkingSpots: body.parkingSpots,
        landAreaM2: body.landAreaM2,
        buildAreaM2: body.buildAreaM2,
        yearBuilt: body.yearBuilt,
        address: body.address,
        latitude: body.latitude,
        longitude: body.longitude,
        features: body.features || [],
        videoUrl: body.videoUrl,
        virtualTourUrl: body.virtualTourUrl,
        status: body.status || 'AVAILABLE',
        featured: body.featured || false,
        zoneId: body.zoneId,
        agentId: body.agentId,
      },
      include: {
        zone: { select: { id: true, name: true } },
        agent: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
      },
    })

    await audit.log('create_property', property.id, true)

    const formattedProperty = formatProperty({
      ...property,
      price: parseFloat(property.price.toString()),
      buildAreaM2: property.buildAreaM2 ? parseFloat(property.buildAreaM2.toString()) : null,
      agent: { id: property.agent.id, name: property.agent.user.name },
    })

    return NextResponse.json(
      createSuccessResponse(formattedProperty, {
        id: property.id,
        url: `/propiedades/${property.slug}`,
        adminUrl: `/admin/propiedades/${property.id}`,
        message: 'Property created successfully',
        humanReadable: `✅ Property '${property.title}' created with ID: ${property.id}\n📍 View: /propiedades/${property.slug}`,
      }),
      { status: 201 }
    )
  } catch (error) {
    return handleError(error, 'create_property')
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
