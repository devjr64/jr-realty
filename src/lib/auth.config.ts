import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"

/**
 * Edge-safe NextAuth configuration.
 *
 * Contains only runtime-agnostic settings (session, pages, callbacks).
 * No imports of prisma, bcrypt, or other Node-only modules.
 * Middleware imports `auth` from this file to avoid bundling Node deps
 * into the Edge runtime and triggering warnings.
 */
export const authConfig = {
  // W: AUTH_URL consistency — trustHost lets NextAuth infer host from request
  // instead of failing when running on 3001 fallback; when AUTH_URL is set
  // it still takes precedence and must match dev port 3000 (see .env).
  trustHost: true,
  session: {
    strategy: "jwt",
    // 8h window — reduces stale role exposure vs default 30d
    maxAge: 60 * 60 * 8,
  },
  pages: { signIn: "/login" },
  // Callbacks are edge-safe (pure token/session transforms).
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        // `role` is declared in src/types/next-auth.d.ts augmentation
        token.role = (user as { role: string }).role as never
      }
      return token
    },
    session({ session, token }) {
      if (session.user && token.id && token.role) {
        session.user.id = token.id as string
        session.user.role = token.role as never
      }
      return session
    },
  },
  // Providers are intentionally empty here — auth.ts extends this
  // config with the Credentials provider (which needs bcrypt/prisma).
  providers: [],
} satisfies NextAuthConfig

// Edge-safe auth instance for middleware (JWT verification only).
export const { auth } = NextAuth(authConfig)
