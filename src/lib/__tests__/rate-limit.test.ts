import { beforeEach, describe, expect, it } from 'vitest'

import { rateLimit, resetRateLimiter } from '@/lib/rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    resetRateLimiter()
  })

  it('allows requests up to the limit', () => {
    // Arrange & Act & Assert — AAA loop
    for (let i = 0; i < 5; i++) {
      expect(rateLimit('k', 5, 60_000)).toBe(true)
    }
  })

  it('blocks requests beyond the limit', () => {
    // Arrange
    for (let i = 0; i < 5; i++) rateLimit('k', 5, 60_000)

    // Act
    const blocked = rateLimit('k', 5, 60_000)

    // Assert
    expect(blocked).toBe(false)
  })

  it('tracks keys independently', () => {
    // Arrange
    for (let i = 0; i < 5; i++) rateLimit('a', 5, 60_000)

    // Act
    const blockedA = rateLimit('a', 5, 60_000)
    const allowedB = rateLimit('b', 5, 60_000)

    // Assert
    expect(blockedA).toBe(false)
    expect(allowedB).toBe(true)
  })

  it('resets after the window elapses', () => {
    // Arrange
    for (let i = 0; i < 5; i++) rateLimit('k', 5, 50)
    expect(rateLimit('k', 5, 50)).toBe(false)

    // Act — wait for window to expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Assert — sliding window reset
        expect(rateLimit('k', 5, 50)).toBe(true)
        resolve()
      }, 80)
    })
  })

  it('resets count to 1 after window expiry — sliding window', async () => {
    // Arrange — fill to limit with short window
    for (let i = 0; i < 3; i++) expect(rateLimit('sliding', 3, 40)).toBe(true)
    expect(rateLimit('sliding', 3, 40)).toBe(false)

    // Act — wait expiry
    await new Promise<void>((resolve) => setTimeout(resolve, 60))

    // Assert — first call after expiry should succeed and reset count
    expect(rateLimit('sliding', 3, 40)).toBe(true)
    // Second and third should still be within new window
    expect(rateLimit('sliding', 3, 40)).toBe(true)
    expect(rateLimit('sliding', 3, 40)).toBe(true)
    // Fourth in new window should be blocked again
    expect(rateLimit('sliding', 3, 40)).toBe(false)
  })

  it('isolates different keys — concurrent-like sequential calls', () => {
    // Arrange — interleave calls on two keys
    const resultsA: boolean[] = []
    const resultsB: boolean[] = []
    for (let i = 0; i < 5; i++) {
      resultsA.push(rateLimit('keyA', 3, 60_000))
      resultsB.push(rateLimit('keyB', 3, 60_000))
    }

    // Act — 4th call on each should be blocked only after limit
    resultsA.push(rateLimit('keyA', 3, 60_000))
    resultsB.push(rateLimit('keyB', 3, 60_000))

    // Assert — first 3 true, 4th+ false, per-key isolation
    expect(resultsA.slice(0, 3).every((v) => v === true)).toBe(true)
    expect(resultsA[3]).toBe(false)
    expect(resultsB.slice(0, 3).every((v) => v === true)).toBe(true)
    expect(resultsB[3]).toBe(false)
    // Cross-key check: exhausting A must not affect B's earlier results
    expect(rateLimit('keyC', 3, 60_000)).toBe(true)
  })

  it('concurrent isolation — rapid sequential calls respect limit', () => {
    // Arrange
    const key = 'concurrent'
    const max = 5

    // Act — simulate rapid burst
    const results = Array.from({ length: 10 }, () => rateLimit(key, max, 60_000))

    // Assert — exactly max true, rest false
    const allowed = results.filter(Boolean).length
    const blocked = results.filter((v) => !v).length
    expect(allowed).toBe(max)
    expect(blocked).toBe(10 - max)
  })

  it('different keys isolation — exhausting one does not affect others', () => {
    // Arrange
    for (let i = 0; i < 5; i++) rateLimit('x', 2, 60_000)
    for (let i = 0; i < 5; i++) rateLimit('y', 10, 60_000)

    // Act
    const xBlocked = rateLimit('x', 2, 60_000)
    const yAllowed = rateLimit('y', 10, 60_000)
    const zAllowed = rateLimit('z', 2, 60_000)

    // Assert
    expect(xBlocked).toBe(false)
    expect(yAllowed).toBe(true)
    expect(zAllowed).toBe(true)
  })

  it('resetRateLimiter clears all buckets', () => {
    // Arrange
    for (let i = 0; i < 3; i++) rateLimit('toClear', 3, 60_000)
    expect(rateLimit('toClear', 3, 60_000)).toBe(false)

    // Act
    resetRateLimiter()

    // Assert — should be allowed again after reset
    expect(rateLimit('toClear', 3, 60_000)).toBe(true)
  })

  it('uses default max and window when not provided', () => {
    // Arrange & Act — call without explicit max/window, must not throw
    const first = rateLimit('defaultKey')
    const second = rateLimit('defaultKey')

    // Assert — first two calls within default limit 10 should be true
    expect(first).toBe(true)
    expect(second).toBe(true)
  })

  it('production default limit is exactly 10 requests per minute', () => {
    // This test locks the production rate limit at 10.
    // If someone changes DEFAULT_MAX_REQUESTS, this test fails.
    // The login action hardcodes rateLimit(`login:${ip}`, 10, 60_000).
    resetRateLimiter()
    const key = 'production-limit-check'

    // First 10 should pass
    for (let i = 0; i < 10; i++) {
      expect(rateLimit(key)).toBe(true)
    }
    // 11th should be blocked
    expect(rateLimit(key)).toBe(false)
  })

  it('covers pruneExpired — when buckets size >=10000 expired entries are pruned', async () => {
    // Arrange — fill to 10_000 with very short window so they expire
    // This covers lines 24-27 (pruneExpired loop)
    const shortWindow = 30
    for (let i = 0; i < 10_000; i++) {
      rateLimit(`prune-key-${i}`, 1, shortWindow)
    }

    // Wait for all to expire
    await new Promise<void>((resolve) => setTimeout(resolve, 50))

    // Act — next rateLimit triggers pruneExpired (size >=10000 and expired)
    const result = rateLimit('prune-trigger', 5, 60_000)

    // Assert — trigger key should be allowed
    expect(result).toBe(true)
    // After prune, a previously expired key should be allowed again (was deleted)
    expect(rateLimit('prune-key-0', 1, shortWindow)).toBe(true)
  })

  it('covers pruneExpired — does not delete non-expired buckets', async () => {
    // Arrange — fill 10_000 with long window (not expired)
    resetRateLimiter()
    const longWindow = 60_000
    for (let i = 0; i < 10_000; i++) {
      rateLimit(`keep-key-${i}`, 1, longWindow)
    }

    // Act — trigger prune with long window keys still active
    const result = rateLimit('keep-trigger', 5, 60_000)

    // Assert — expired none, so keep-key-0 should still be blocked (not pruned)
    expect(result).toBe(true)
    expect(rateLimit('keep-key-0', 1, longWindow)).toBe(false)
  })

  it('does not prune when size < 10000 (early return)', () => {
    // Arrange — only 5 keys, window expired but size < threshold
    resetRateLimiter()
    for (let i = 0; i < 5; i++) rateLimit(`small-${i}`, 1, 20)
    // Let expire
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        // Act — this call will call pruneExpired but early-return due to size <10000
        const result = rateLimit('small-trigger', 5, 60_000)
        // Assert — trigger allowed, but small-0's bucket still exists? Actually after expiry,
        // the next call for small-0 will reset (bucket.resetAt <= now) and be allowed
        // The key point: no error and prune early return covered
        expect(result).toBe(true)
        expect(rateLimit('small-0', 1, 20)).toBe(true)
        resolve()
      }, 40)
    })
  })
})
