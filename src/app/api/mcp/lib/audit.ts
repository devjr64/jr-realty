import { db } from '@/lib/db'

export interface AuditLogInput {
  apiKeyId: string
  operation: string
  resourceId?: string
  success: boolean
  error?: string
  ipAddress?: string
}

/**
 * Logs an MCP operation to the audit log
 * Fire-and-forget: does not throw on error
 */
export async function logMcpOperation(input: AuditLogInput): Promise<void> {
  try {
    await db.mcpAuditLog.create({
      data: {
        apiKeyId: input.apiKeyId,
        operation: input.operation,
        resourceId: input.resourceId,
        success: input.success,
        error: input.error,
        ipAddress: input.ipAddress,
      },
    })
  } catch (error) {
    // Log error but don't throw - audit logging should not break the main operation
    console.error('Failed to log MCP operation:', error)
  }
}

/**
 * Creates an audit logger for a specific API key
 */
export function createAuditLogger(apiKeyId: string, ipAddress?: string) {
  return {
    log: (operation: string, resourceId: string | undefined, success: boolean, error?: string) =>
      logMcpOperation({
        apiKeyId,
        operation,
        resourceId,
        success,
        error,
        ipAddress,
      }),
  }
}
