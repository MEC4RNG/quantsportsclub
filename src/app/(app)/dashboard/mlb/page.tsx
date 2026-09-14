import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { mlbGsimResultsSchema } from '@/schemas/mlbGsimResults'
import MlbSlate from '@/components/MlbSlate'
import MlbRefresh from '@/components/MlbRefresh'

export const dynamic = 'force-dynamic'

export default async function MlbResultsPage({ searchParams }: {
  searchParams: Promise<{ date?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin?callbackUrl=/dashboard/mlb')
  const requested = (await searchParams).date
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date())
  const date = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : today
  // Read one complete snapshot; never fill blocked games from older projections.
  const latest = await prisma.mlbGsimResult.findFirst({
    where: { slateDate: date }, orderBy: [{ generatedAt: 'desc' }, { receivedAt: 'desc' }],
  })
  const parsed = mlbGsimResultsSchema.safeParse(latest?.payload)
  return <><MlbRefresh /><MlbSlate date={date} slate={parsed.success ? parsed.data : null} /></>
}
