import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import { Card, CardContent } from '@/components/ui/card'
import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils/format'

export const metadata: Metadata = {
  title: 'Blog | JR Realty',
  description: 'Guías y análisis del mercado inmobiliario en Venezuela.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 300 // ISR: 5 min

export default async function BlogPage() {
  const posts = await db.blogPost.findMany({
    where: { published: true },
    orderBy: { publishedAt: 'desc' },
    include: { author: { select: { name: true } } },
  })

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Blog inmobiliario
        </h1>
        <p className="mt-2 text-muted-foreground">
          Guías, consejos y análisis del mercado inmobiliario venezolano.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-20 text-center">
          <p className="font-heading text-xl">Próximamente</p>
          <p className="mt-2 text-muted-foreground">Estamos preparando contenido.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
              <Card className="overflow-hidden transition-shadow group-hover:shadow-lg">
                <div className="relative aspect-[16/9] w-full bg-muted">
                  {post.coverImage ? (
                    <Image
                      src={post.coverImage}
                      alt={post.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="grid size-full place-items-center font-heading text-3xl text-muted-foreground">
                      MC
                    </div>
                  )}
                </div>
                <CardContent className="space-y-2 p-4">
                  <p className="text-xs text-muted-foreground">
                    {post.author.name} · {post.publishedAt ? formatDate(post.publishedAt) : ''}
                  </p>
                  <h2 className="font-heading text-lg font-semibold leading-snug group-hover:text-primary">
                    {post.title}
                  </h2>
                  {post.excerpt ? (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {post.excerpt}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
