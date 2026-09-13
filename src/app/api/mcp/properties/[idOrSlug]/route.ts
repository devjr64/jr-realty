import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateMcpApiKey, McpAuthenticationError, McpAuthorizationError } from '../../lib/auth'
import { createAuditLogger } from '../../lib/audit'
import {
  createSuccessResponse,
  createErrorResponse,
  MCP_ERROR_CODES,
  formatProperty,
} from '../../lib/formatters'

export async function GET(request: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const { idOrSlug } = await params

    let property = await db.property.findUnique({
      where: { id: idOrSlug },
      include: {
        zone: { select: { id: true, name: true, slug: true } },
        agent: {
          select: {
            id: true,
            user: { select: { name: true, email: true } },
          },
        },
        images: { orderBy: { sortOrder: 'asc' } },
        tags: true,
      },
    })

    if (!property) {
      property = await db.property.findUnique({
        where: { slug: idOrSlug },
        include: {
          zone: { select: { id: true, name: true, slug: true } },
          agent: {
            select: {
              id: true,
              user: { select: { name: true, email: true } },
            },
          },
          images: { orderBy: { sortOrder: 'asc' } },
          tags: true,
        },
      })
    }

    if (!property) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.NOT_FOUND, 'Property not found'),
        { status: 404 }
      )
    }

    await audit.log('get_property', property.id, true)

    const formattedProperty = {
      ...formatProperty({
        ...property,
        price: parseFloat(property.price.toString()),
        buildAreaM2: property.buildAreaM2 ? parseFloat(property.buildAreaM2.toString()) : null,
        agent: { id: property.agent.id, name: property.agent.user.name },
      }),
      description: property.description,
      type: property.type,
      operation: property.operation,
      halfBathrooms: property.halfBathrooms,
      parkingSpots: property.parkingSpots,
      landAreaM2: property.landAreaM2 ? parseFloat(property.landAreaM2.toString()) : null,
      yearBuilt: property.yearBuilt,
      address: property.address,
      latitude: property.latitude,
      longitude: property.longitude,
      features: property.features,
      videoUrl: property.videoUrl,
      virtualTourUrl: property.virtualTourUrl,
      featured: property.featured,
      viewsCount: property.viewsCount,
      zone: property.zone,
      images: property.images.map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        sortOrder: img.sortOrder,
      })),
      tags: property.tags.map((t) => t.tag),
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    }

    return NextResponse.json(
      createSuccessResponse(formattedProperty, {
        id: property.id,
        url: `/propiedades/${property.slug}`,
        adminUrl: `/admin/propiedades/${property.id}`,
        message: 'Property retrieved successfully',
        humanReadable: `📍 Property: ${property.title}\n💰 Price: $${property.price}\n🛏️ ${property.bedrooms} bedrooms, ${property.bathrooms} bathrooms`,
      })
    )
  } catch (error) {
    return handleError(error, 'get_property')
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const { idOrSlug } = await params
    const body = await request.json()

    let property = await db.property.findUnique({ where: { id: idOrSlug } })
    if (!property) {
      property = await db.property.findUnique({ where: { slug: idOrSlug } })
    }

    if (!property) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.NOT_FOUND, 'Property not found'),
        { status: 404 }
      )
    }

    if (body.slug && body.slug !== property.slug) {
      const existingProperty = await db.property.findUnique({ where: { slug: body.slug } })
      if (existingProperty) {
        return NextResponse.json(
          createErrorResponse(MCP_ERROR_CODES.CONFLICT, 'Slug already in use', {
            slug: `Slug "${body.slug}" is already in use`,
          }),
          { status: 409 }
        )
      }
    }

    if (body.zoneId && body.zoneId !== property.zoneId) {
      const zone = await db.zone.findUnique({ where: { id: body.zoneId } })
      if (!zone) {
        return NextResponse.json(
          createErrorResponse(MCP_ERROR_CODES.NOT_FOUND, 'Zone not found', {
            zoneId: `Zone with ID ${body.zoneId} does not exist`,
          }),
          { status: 404 }
        )
      }
    }

    if (body.agentId && body.agentId !== property.agentId) {
      const agent = await db.agent.findUnique({ where: { id: body.agentId } })
      if (!agent) {
        return NextResponse.json(
          createErrorResponse(MCP_ERROR_CODES.NOT_FOUND, 'Agent not found', {
            agentId: `Agent with ID ${body.agentId} does not exist`,
          }),
          { status: 404 }
        )
      }
    }

    const updatedProperty = await db.property.update({
      where: { id: property.id },
      data: {
        title: body.title,
        slug: body.slug,
        description: body.description,
        type: body.type,
        operation: body.operation,
        price: body.price,
        currency: body.currency,
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
        features: body.features,
        videoUrl: body.videoUrl,
        virtualTourUrl: body.virtualTourUrl,
        status: body.status,
        featured: body.featured,
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

    await audit.log('update_property', property.id, true)

    const formattedProperty = formatProperty({
      ...updatedProperty,
      price: parseFloat(updatedProperty.price.toString()),
      buildAreaM2: updatedProperty.buildAreaM2 ? parseFloat(updatedProperty.buildAreaM2.toString()) : null,
      agent: { id: updatedProperty.agent.id, name: updatedProperty.agent.user.name },
    })

    return NextResponse.json(
      createSuccessResponse(formattedProperty, {
        id: updatedProperty.id,
        url: `/propiedades/${updatedProperty.slug}`,
        adminUrl: `/admin/propiedades/${updatedProperty.id}`,
        message: 'Property updated successfully',
        humanReadable: `✅ Property '${updatedProperty.title}' updated successfully`,
      })
    )
  } catch (error) {
    return handleError(error, 'update_property')
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ idOrSlug: string }> }) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const { idOrSlug } = await params
    const body = await request.json().catch(() => ({}))

    if (!body.confirm) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.VALIDATION_ERROR, 'Confirmation required', {
          confirm: 'Set confirm: true to delete the property',
        }),
        { status: 400 }
      )
    }

    let property = await db.property.findUnique({ where: { id: idOrSlug } })
    if (!property) {
      property = await db.property.findUnique({ where: { slug: idOrSlug } })
    }

    if (!property) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.NOT_FOUND, 'Property not found'),
        { status: 404 }
      )
    }

    await db.property.delete({ where: { id: property.id } })

    await audit.log('delete_property', property.id, true)

    return NextResponse.json(
      createSuccessResponse({ deleted: true }, {
        message: 'Property deleted successfully',
        humanReadable: `✅ Property '${property.title}' deleted successfully`,
      })
    )
  } catch (error) {
    return handleError(error, 'delete_property')
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
