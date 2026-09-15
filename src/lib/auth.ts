// src/lib/auth.ts
import type { NextAuthOptions } from 'next-auth'
import GitHub from 'next-auth/providers/github'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db'
import { isContentReviewer } from '@/lib/contentReviewAccess'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID ?? '',
      clientSecret: process.env.GITHUB_SECRET ?? '',
      issuer: 'https://github.com/login/oauth',
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async session({ session, token, user }) {
      const id = user?.id ?? token?.sub
      if (session?.user) {
        ;(session.user as any).id = id
        ;(session.user as any).contentReviewer = await isContentReviewer(id)
      }
      return session
    },
  },
  session: { strategy: 'database' }, // optional; with adapter you can use DB sessions
}
