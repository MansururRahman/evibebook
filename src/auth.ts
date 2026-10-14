import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from '@/auth.config'
import { prisma } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { logInSchema } from '@/features/auth/schemas'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = logInSchema.safeParse(raw)
        if (!parsed.success) return null
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        })
        if (!user) return null
        const ok = await verifyPassword(parsed.data.password, user.passwordHash)
        if (!ok) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
})
