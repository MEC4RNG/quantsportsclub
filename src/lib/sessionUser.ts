import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function getSessionUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string } | undefined)?.id ?? null
}
