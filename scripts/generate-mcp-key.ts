#!/usr/bin/env tsx
/**
 * Script to generate MCP API keys
 *
 * Usage:
 *   pnpm exec tsx scripts/generate-mcp-key.ts <environment> <user_email>
 *
 * Example:
 *   pnpm exec tsx scripts/generate-mcp-key.ts development admin@example.com
 */

import { db } from '@/lib/db'
import { generateMcpApiKey, hashMcpApiKey } from '@/app/api/mcp/lib/auth'

async function main() {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error('Usage: pnpm exec tsx scripts/generate-mcp-key.ts <environment> <user_email>')
    console.error(
      'Example: pnpm exec tsx scripts/generate-mcp-key.ts development admin@example.com'
    )
    process.exit(1)
  }

  const [environment, userEmail] = args

  // Find user
  const user = await db.user.findUnique({
    where: { email: userEmail },
  })

  if (!user) {
    console.error(`User with email ${userEmail} not found`)
    process.exit(1)
  }

  if (user.role !== 'SUPER_ADMIN') {
    console.error(`User ${userEmail} is not a SUPER_ADMIN. Only SUPER_ADMIN users can use MCP.`)
    process.exit(1)
  }

  // Generate API key (CSPRNG) — the raw key is displayed ONCE below and
  // never stored; the database keeps only its SHA-256 hash.
  const key = generateMcpApiKey(environment)

  // Create API key record (hashed at rest)
  await db.mcpApiKey.create({
    data: {
      key: hashMcpApiKey(key),
      name: `${environment.charAt(0).toUpperCase() + environment.slice(1)} Key`,
      environment,
      userId: user.id,
      active: true,
    },
  })

  console.log('✅ MCP API Key generated successfully!')
  console.log('')
  console.log(`Environment: ${environment}`)
  console.log(`User: ${user.name} (${user.email})`)
  console.log(`API Key (shown ONCE — store it now, it cannot be recovered): ${key}`)
  console.log('')
  console.log('📝 Next steps:')
  console.log('')
  const serverName = environment === 'production' ? 'jrrealty-prod' : 'jrrealty-dev'
  const serverUrl =
    environment === 'production'
      ? 'https://jrrealty.com/api/mcp'
      : 'http://localhost:3000/api/mcp'

  console.log('1. Add this key to your .opencode/opencode.jsonc:')
  console.log('')
  console.log('   {')
  console.log('     "mcp": {')
  console.log(`       "${serverName}": {`)
  console.log('         "type": "local",')
  console.log('         "command": ["./mcp-server/start.sh"],')
  console.log('         "environment": {')
  console.log(`           "MCP_API_KEY": "${key}",`)
  console.log(`           "MCP_SERVER_URL": "${serverUrl}"`)
  console.log('         },')
  console.log('         "enabled": true')
  console.log('       }')
  console.log('     }')
  console.log('   }')
  console.log('')
  console.log('2. Install MCP server dependencies (if not already done):')
  console.log('   cd mcp-server && pnpm install')
  console.log('')
  console.log('3. Restart opencode to load the new MCP configuration')
}

main()
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
