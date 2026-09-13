import { describe, expect, it } from 'vitest'

import { blogPostSchema } from '@/lib/validations/blog-post.schema'

describe('blogPostSchema', () => {
  const base = {
    title: 'Invertir en bienes raíces en Venezuela',
    content: 'Este es un contenido válido con más de veinte caracteres para pasar la validación.',
    published: false,
  }

  it('accepts valid markdown string content', () => {
    const result = blogPostSchema.safeParse(base)
    expect(result.success).toBe(true)
  })

  it('accepts block array content', () => {
    const result = blogPostSchema.safeParse({
      ...base,
      content: [{ type: 'markdown', content: '## Hola' }, { type: 'hero', title: 'Hero' }],
    })
    expect(result.success).toBe(true)
  })

  it('accepts empty excerpt and coverImage as null', () => {
    const result = blogPostSchema.safeParse({ ...base, excerpt: null, coverImage: null })
    expect(result.success).toBe(true)
  })

  it('rejects markdown shorter than 20 chars', () => {
    const result = blogPostSchema.safeParse({ ...base, content: 'corto' })
    expect(result.success).toBe(false)
  })

  it('rejects markdown longer than 50000 chars', () => {
    const result = blogPostSchema.safeParse({ ...base, content: 'a'.repeat(50001) })
    expect(result.success).toBe(false)
  })

  it('rejects empty block array', () => {
    const result = blogPostSchema.safeParse({ ...base, content: [] })
    expect(result.success).toBe(false)
  })

  it('rejects block array exceeding 30 items', () => {
    const blocks = Array.from({ length: 31 }, (_, i) => ({ type: 'text', body: `b${i}` }))
    const result = blogPostSchema.safeParse({ ...base, content: blocks })
    expect(result.success).toBe(false)
  })

  it('accepts exactly 30 blocks', () => {
    const blocks = Array.from({ length: 30 }, (_, i) => ({ type: 'text', body: `b${i}` }))
    const result = blogPostSchema.safeParse({ ...base, content: blocks })
    expect(result.success).toBe(true)
  })

  it('rejects title shorter than 3 chars', () => {
    const result = blogPostSchema.safeParse({ ...base, title: 'ab' })
    expect(result.success).toBe(false)
  })

  it('rejects title longer than 200 chars', () => {
    const result = blogPostSchema.safeParse({ ...base, title: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('defaults published to false when omitted', () => {
    const { title, content } = base
    const result = blogPostSchema.safeParse({ title, content })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.published).toBe(false)
  })

  it('coerces excerpt undefined to optional', () => {
    const result = blogPostSchema.safeParse({ ...base, excerpt: undefined })
    expect(result.success).toBe(true)
  })
})
