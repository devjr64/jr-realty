import { describe, expect, it } from 'vitest'

import { slugify, slugifyUnique } from '@/lib/utils/slugify'

describe('slugify', () => {
  it('lowercases and kebab-cases basic input', () => {
    expect(slugify('Las Mercedes')).toBe('las-mercedes')
  })

  it('strips Spanish diacritics', () => {
    expect(slugify('El Rosal')).toBe('el-rosal')
    expect(slugify('Ñuñoa')).toBe('nunoa')
    expect(slugify('Áéíóú')).toBe('aeiou')
  })

  it('replaces underscores and collapses multiple dashes', () => {
    expect(slugify('a_b  c')).toBe('a-b-c')
    expect(slugify('a---b')).toBe('a-b')
  })

  it('drops invalid characters and trims edge dashes', () => {
    expect(slugify('  ¡Hola! ¿Qué tal?  ')).toBe('hola-que-tal')
    expect(slugify('-leading-trailing-')).toBe('leading-trailing')
  })

  it('returns empty string for input with no valid chars', () => {
    expect(slugify('!!!')).toBe('')
  })
})

describe('slugifyUnique', () => {
  it('returns the base slug when free', () => {
    expect(slugifyUnique('Casa', ['otro-slug'])).toBe('casa')
  })

  it('appends -2, -3 for collisions', () => {
    expect(slugifyUnique('Casa', ['casa', 'casa-2'])).toBe('casa-3')
  })

  it('returns empty string when base is empty', () => {
    expect(slugifyUnique('!!!', [])).toBe('')
  })
})