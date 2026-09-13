/**
 * MCP Response Formatters
 * Standardizes response format for all MCP tools
 */

export interface McpSuccessResponse<T = unknown> {
  success: true
  data: T
  metadata: {
    id?: string
    url?: string
    adminUrl?: string
    message: string
    humanReadable: string
  }
}

export interface McpErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, string>
  }
  metadata: {
    message: string
    humanReadable: string
  }
}

export type McpResponse<T = unknown> = McpSuccessResponse<T> | McpErrorResponse

/**
 * Error codes for MCP responses
 */
export const MCP_ERROR_CODES = {
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

/**
 * Creates a success response
 */
export function createSuccessResponse<T>(
  data: T,
  metadata: {
    id?: string
    url?: string
    adminUrl?: string
    message: string
    humanReadable: string
  }
): McpSuccessResponse<T> {
  return {
    success: true,
    data,
    metadata,
  }
}

/**
 * Creates an error response
 */
export function createErrorResponse(
  code: keyof typeof MCP_ERROR_CODES,
  message: string,
  details?: Record<string, string>
): McpErrorResponse {
  const humanReadableError = details
    ? Object.entries(details)
        .map(([field, error]) => `⚠️ ${field}: ${error}`)
        .join('\n')
    : ''

  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    metadata: {
      message,
      humanReadable: `❌ ${message}${humanReadableError ? '\n' + humanReadableError : ''}`,
    },
  }
}

/**
 * Formats a property for API response
 */
export function formatProperty(property: {
  id: string
  title: string
  slug: string
  price: number | string
  currency: string
  bedrooms?: number | null
  bathrooms?: number | null
  buildAreaM2?: number | string | null
  status: string
  zone?: { id: string; name: string } | null
  agent?: { id: string; name: string } | null
}) {
  return {
    id: property.id,
    title: property.title,
    slug: property.slug,
    price: typeof property.price === 'string' ? parseFloat(property.price) : property.price,
    currency: property.currency,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    buildAreaM2:
      typeof property.buildAreaM2 === 'string'
        ? parseFloat(property.buildAreaM2)
        : property.buildAreaM2,
    status: property.status,
    zone: property.zone
      ? {
          id: property.zone.id,
          name: property.zone.name,
        }
      : null,
    agent: property.agent
      ? {
          id: property.agent.id,
          name: property.agent.name,
        }
      : null,
  }
}

/**
 * Formats a user for API response
 */
export function formatUser(user: {
  id: string
  name: string
  email: string
  role: string
  phone?: string | null
  active: boolean
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    active: user.active,
  }
}

/**
 * Formats an agent for API response
 */
export function formatAgent(agent: {
  id: string
  userId: string
  title?: string | null
  phone: string
  whatsapp?: string | null
  active: boolean
  user?: { name: string; email: string } | null
  _count?: { properties: number } | null
}) {
  return {
    id: agent.id,
    userId: agent.userId,
    name: agent.user?.name,
    email: agent.user?.email,
    title: agent.title,
    phone: agent.phone,
    whatsapp: agent.whatsapp,
    active: agent.active,
    propertiesCount: agent._count?.properties ?? 0,
  }
}

/**
 * Formats pagination metadata
 */
export function formatPagination(total: number, limit: number, offset: number) {
  return {
    total,
    limit,
    offset,
    hasMore: offset + limit < total,
  }
}
