// src/lib/auth.ts
import type { NextAuthOptions } from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID ?? '',
      clientSecret: process.env.GITHUB_SECRET ?? '',
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      const id = (token as any)?.sub
      if (session?.user && id) (session.user as any).id = id
      return session
    },
  },
  session: { strategy: 'database' }, // optional; with adapter you can use DB sessions
}
