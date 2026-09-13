import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { compare } from "bcryptjs"

import { authConfig } from "./auth.config"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Full NextAuth instance — extends edge-safe authConfig with the
 * Credentials provider (requires bcrypt + prisma, Node-only).
 * Handlers/signIn/signOut are server-only; middleware uses the
 * edge-safe `auth` from auth.config.ts instead.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email
        const password = credentials?.password

        if (typeof email !== "string" || typeof password !== "string") return null
        if (password.length === 0) return null

        const normalizedEmail = email.trim().toLowerCase()
        if (!EMAIL_PATTERN.test(normalizedEmail)) return null

        try {
          // Node-only: prisma is never bundled into the Edge runtime
          // because middleware imports from auth.config.ts, not this file.
          const { db } = await import("@/lib/db")
          const user = await db.user.findUnique({ where: { email: normalizedEmail } })

          if (!user || !user.active) return null

          const isValidPassword = await compare(password, user.passwordHash)
          if (!isValidPassword) return null

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          }
        } catch {
          return null
        }
      },
    }),
  ],
})
