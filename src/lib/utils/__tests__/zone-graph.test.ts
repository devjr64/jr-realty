import { describe, expect, it } from 'vitest'

import { wouldCreateCycle } from '@/lib/utils/zone-graph'

describe('wouldCreateCycle', () => {
  const parents = new Map<string, string | null>([
    ['a', null],
    ['b', 'a'],
    ['c', 'b'],
  ])

  it('rejects self-reference', () => {
    expect(wouldCreateCycle(parents, 'a', 'a')).toBe(true)
  })

  it('rejects assigning a descendant as parent of its ancestor', () => {
    // c es descendiente de a → asignar a como padre de c crearía un ciclo.
    expect(wouldCreateCycle(parents, 'c', 'a')).toBe(true)
    expect(wouldCreateCycle(parents, 'c', 'b')).toBe(true)
  })

  it('allows assigning an unrelated zone as parent', () => {
    expect(wouldCreateCycle(parents, 'a', 'c')).toBe(false)
    expect(wouldCreateCycle(parents, 'b', 'c')).toBe(false)
  })

  it('allows assigning a parent to a new zone (not in the map)', () => {
    expect(wouldCreateCycle(parents, 'nueva', 'a')).toBe(false)
  })

  it('detects pre-existing corrupt cycles defensively', () => {
    const corrupt = new Map<string, string | null>([
      ['x', 'y'],
      ['y', 'x'],
    ])
    expect(wouldCreateCycle(corrupt, 'x', 'z')).toBe(true)
  })
})