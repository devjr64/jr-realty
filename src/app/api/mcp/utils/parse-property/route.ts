import { NextRequest, NextResponse } from 'next/server'
import { validateMcpApiKey, McpAuthenticationError, McpAuthorizationError } from '../../lib/auth'
import { createAuditLogger } from '../../lib/audit'
import { createSuccessResponse, createErrorResponse, MCP_ERROR_CODES } from '../../lib/formatters'

/**
 * Parses property data from Word document or plain text
 * Maps Spanish terms to English enums
 */
export async function POST(request: NextRequest) {
  try {
    const apiKeyData = await validateMcpApiKey(request)
    const audit = createAuditLogger(apiKeyData.id, undefined)

    const body = await request.json()

    if (!body.content) {
      return NextResponse.json(
        createErrorResponse(MCP_ERROR_CODES.VALIDATION_ERROR, 'Missing content field'),
        { status: 400 }
      )
    }

    const content = body.content
    const format = body.format || 'text'

    // Parse the content
    const parsed = parsePropertyContent(content, format)

    await audit.log('parse_property_document', undefined, true)

    return NextResponse.json(
      createSuccessResponse(
        {
          parsed: parsed.data,
          confidence: parsed.confidence,
          missingFields: parsed.missingFields,
        },
        {
          message: 'Property data parsed successfully',
          humanReadable: `📄 Parsed property: '${parsed.data.title || 'Unknown'}'\n💰 Price: $${parsed.data.price || 'N/A'}\n⚠️ Missing: ${parsed.missingFields.join(', ') || 'None'}`,
        }
      )
    )
  } catch (error) {
    return handleError(error, 'parse_property_document')
  }
}

/**
 * Parses property content and extracts structured data
 */
function parsePropertyContent(content: string, format: string) {
  const data: Record<string, unknown> = {}
  const missingFields: string[] = []
  let confidence = 1.0

  // Extract title (PROPIEDAD or first line)
  const titleMatch = content.match(/PROPIEDAD[:\s]+([^\n]+)/i)
  if (titleMatch) {
    data.title = titleMatch[1].trim()
  } else {
    const firstLine = content.split('\n')[0].trim()
    if (firstLine && firstLine.length < 100) {
      data.title = firstLine
    } else {
      missingFields.push('title')
      confidence -= 0.2
    }
  }

  // Extract operation (OPERACIÓN)
  const operationMatch = content.match(/OPERACIÓN[:\s]+([^\n]+)/i)
  if (operationMatch) {
    const operationText = operationMatch[1].trim().toLowerCase()
    if (operationText.includes('venta')) {
      data.operation = 'SALE'
    } else if (operationText.includes('alquiler') || operationText.includes('renta')) {
      data.operation = 'RENT'
    } else if (operationText.includes('ambos')) {
      data.operation = 'BOTH'
    }
  } else {
    missingFields.push('operation')
    confidence -= 0.2
  }

  // Extract price
  const priceMatch = content.match(/Precio[:\s]+\$?([\d,]+)/i)
  if (priceMatch) {
    data.price = parseFloat(priceMatch[1].replace(/,/g, ''))
    data.currency = 'USD'
  } else {
    missingFields.push('price')
    confidence -= 0.3
  }

  // Extract area
  const areaMatch = content.match(/Área[:\s]+([\d.]+)\s*m2/i)
  if (areaMatch) {
    data.buildAreaM2 = parseFloat(areaMatch[1])
  }

  // Extract bedrooms
  const bedroomsMatch = content.match(/Habitaciones[:\s]+(\d+)/i)
  if (bedroomsMatch) {
    data.bedrooms = parseInt(bedroomsMatch[1])
  }

  // Extract bathrooms
  const bathroomsMatch = content.match(/Baños[:\s]+(\d+)/i)
  if (bathroomsMatch) {
    data.bathrooms = parseInt(bathroomsMatch[1])
  }

  // Extract parking
  const parkingMatch = content.match(/Estacionamiento[:\s]+(\d+)/i)
  if (parkingMatch) {
    data.parkingSpots = parseInt(parkingMatch[1])
  }

  // Extract features
  const features: string[] = []
  if (/piscina/i.test(content)) features.push('pool')
  if (/gym|gimnasio/i.test(content)) features.push('gym')
  if (/salón de fiestas|salon de fiestas/i.test(content)) features.push('party_room')
  if (/área de niños|area de niños/i.test(content)) features.push('kids_area')
  if (/cancha/i.test(content)) features.push('sports_court')
  if (/seguridad/i.test(content)) features.push('security')
  if (/amueblado/i.test(content)) features.push('furnished')
  if (features.length > 0) {
    data.features = features
  }

  // Extract owner and responsible
  const ownerMatch = content.match(/NOMBRE DEL PROPIETARIO[:\s]+([^\n]+)/i)
  if (ownerMatch) {
    data.owner = ownerMatch[1].trim()
  }

  const responsibleMatch = content.match(/RESPONSABLE DE PROPIEDAD[:\s]+([^\n]+)/i)
  if (responsibleMatch) {
    data.responsible = responsibleMatch[1].trim()
  }

  // Extract description (everything after DESCRIPCIÓN)
  const descMatch = content.match(/DESCRIPCIÓN DE LA PROPIEDAD[:\s]*\n?([\s\S]+)/i)
  if (descMatch) {
    data.description = descMatch[1].trim()
  } else {
    data.description = content
  }

  // Check for required fields
  if (!data.title) missingFields.push('title')
  if (!data.operation) missingFields.push('operation')
  if (!data.price) missingFields.push('price')
  missingFields.push('zoneId', 'agentId', 'address')

  // Determine property type from title
  if (data.title) {
    const title = (data.title as string).toLowerCase()
    if (title.includes('apartamento') || title.includes('apto')) {
      data.type = 'APARTMENT'
    } else if (title.includes('casa')) {
      data.type = 'HOUSE'
    } else if (title.includes('penthouse') || title.includes('ph')) {
      data.type = 'PENTHOUSE'
    } else if (title.includes('oficina')) {
      data.type = 'OFFICE'
    } else if (title.includes('local')) {
      data.type = 'COMMERCIAL'
    } else if (title.includes('terreno')) {
      data.type = 'LAND'
    }
  }

  return {
    data,
    confidence: Math.max(0, confidence),
    missingFields,
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
