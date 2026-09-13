import { createHash, randomBytes } from 'node:crypto'

import { db } from '@/lib/db'
import { NextRequest } from 'next/server'

export class McpAuthenticationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'McpAuthenticationError'
  }
}

export class McpAuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'McpAuthorizationError'
  }
}

export interface McpApiKeyData {
  id: string
  name: string
  environment: string
  userId: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

/**
 * Validates MCP API key from request headers
 * Returns the API key data with user information if valid
 * Throws McpAuthenticationError or McpAuthorizationError if invalid
 */
export async function validateMcpApiKey(request: NextRequest): Promise<McpApiKeyData> {
  const apiKey = request.headers.get('X-API-Key')

  if (!apiKey) {
    throw new McpAuthenticationError('Missing API key. Provide X-API-Key header.')
  }

  const keyData = await db.mcpApiKey.findUnique({
    // Keys are stored as SHA-256 hashes — look up by the hash of the
    // presented key so the raw value never touches the database.
    where: { key: hashMcpApiKey(apiKey) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  })

  if (!keyData) {
    throw new McpAuthenticationError('Invalid API key.')
  }

  if (!keyData.active) {
    throw new McpAuthenticationError('API key is inactive.')
  }

  if (keyData.expiresAt && keyData.expiresAt < new Date()) {
    throw new McpAuthenticationError('API key has expired.')
  }

  if (keyData.user.role !== 'SUPER_ADMIN') {
    throw new McpAuthorizationError('Only SUPER_ADMIN users can access MCP endpoints.')
  }

  // Update last used timestamp (fire and forget)
  db.mcpApiKey
    .update({
      where: { id: keyData.id },
      data: { lastUsedAt: new Date() },
    })
    .catch((error) => {
      console.error('Failed to update API key lastUsedAt:', error)
    })

  return {
    id: keyData.id,
    name: keyData.name,
    environment: keyData.environment,
    userId: keyData.userId,
    user: keyData.user,
  }
}

/**
 * SHA-256 hex digest of an MCP API key — the only form ever persisted.
 * Deterministic, so validation is a plain unique lookup on the hash.
 */
export function hashMcpApiKey(key: string): string {
  return createHash('sha256').update(key, 'utf8').digest('hex')
}

/**
 * Generates a new MCP API key
 * Format: mcp_<environment>_<32_random_chars>
 *
 * SECURITY: the random part comes from `randomBytes` (CSPRNG), never
 * `Math.random()` (predictable). 16 bytes → 32 hex chars = 128 bits of
 * entropy, unbiased (no modulo mapping). The raw key is shown to the
 * operator exactly once at creation; only its SHA-256 hash is stored.
 */
export function generateMcpApiKey(environment: string = 'development'): string {
  const randomPart = randomBytes(16).toString('hex')
  return `mcp_${environment}_${randomPart}`
}
