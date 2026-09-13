import React from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'

type MarkdownContent = string | unknown

function normalize(content: MarkdownContent): string {
  if (typeof content === 'string') return content
  if (content === null || content === undefined) return ''
  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') return item
        if (item && typeof item === 'object') {
          const r = item as Record<string, unknown>
          if (typeof r.text === 'string') return r.text
          if (typeof r.body === 'string') return r.body
        }
        return JSON.stringify(item)
      })
      .join('\n\n')
  }
  if (typeof content === 'object') return JSON.stringify(content)
  return String(content)
}

interface MarkdownRendererProps {
  content: MarkdownContent
  className?: string
}

/**
 * Pure functional markdown renderer — XSS-safe via rehype-sanitize.
 * Handles string and Prisma Json (array/object) content.
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const markdown = normalize(content)
  if (!markdown.trim()) return null

  return (
    <div
      className={
        className ?? 'prose prose-neutral max-w-none dark:prose-invert leading-relaxed'
      }
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
