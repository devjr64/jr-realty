import { createHash } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { generateMcpApiKey, hashMcpApiKey } from '@/app/api/mcp/lib/auth'

describe('generateMcpApiKey', () => {
  it('matches the documented mcp_<env>_<32 chars> format', () => {
    expect(generateMcpApiKey('development')).toMatch(/^mcp_development_[0-9a-f]{32}$/)
    expect(generateMcpApiKey('production')).toMatch(/^mcp_production_[0-9a-f]{32}$/)
  })

  it('defaults the environment to development', () => {
    expect(generateMcpApiKey()).toMatch(/^mcp_development_[0-9a-f]{32}$/)
  })

  it('generates unique keys (CSPRNG, not Math.random)', () => {
    const keys = new Set(Array.from({ length: 200 }, () => generateMcpApiKey('dev')))
    expect(keys.size).toBe(200)
  })
})

describe('hashMcpApiKey', () => {
  it('is deterministic — same key, same hash', () => {
    expect(hashMcpApiKey('mcp_dev_abc123')).toBe(hashMcpApiKey('mcp_dev_abc123'))
  })

  it('matches an independent SHA-256 hex digest', () => {
    const key = 'mcp_dev_deadbeef'
    const expected = createHash('sha256').update(key, 'utf8').digest('hex')
    expect(hashMcpApiKey(key)).toBe(expected)
  })

  it('produces a 64-char hex digest (sha256)', () => {
    expect(hashMcpApiKey('any-key')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('differs for different keys', () => {
    expect(hashMcpApiKey('key-one')).not.toBe(hashMcpApiKey('key-two'))
  })
})
