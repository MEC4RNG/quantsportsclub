export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { mlbGsimResultsSchema } from '@/schemas/mlbGsimResults'

const card = {
  border: '1px solid rgba(255,255,255,.12)', borderRadius: 14, padding: 20, background: '#111a2e',
} as const
const links = { display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 } as const
const action = { color: '#8fc7ff', fontWeight: 700 } as const

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const user = session?.user as { id?: string; name?: string | null; contentReviewer?: boolean } | undefined
  if (!user?.id) redirect('/auth/signin?callbackUrl=/dashboard')
  const contentReviewer = user.contentReviewer === true

  const [latestMlb, latestNfl, bankroll, pendingReviews] = await Promise.all([
    prisma.mlbGsimResult.findFirst({
      orderBy: [{ generatedAt: 'desc' }, { receivedAt: 'desc' }],
      select: { slateDate: true, generatedAt: true, payload: true },
    }),
    prisma.nflGsimResult.findFirst({
      orderBy: { generatedAt: 'desc' },
      select: {
        season: true, week: true, generatedAt: true,
        _count: { select: { games: true, blockedGames: true } },
      },
    }),
    prisma.bankrollEntry.findMany({
      where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 5,
    }),
    contentReviewer
      ? prisma.contentDraftPackage.count({ where: { reviewStatus: 'PENDING_REVIEW' } })
      : Promise.resolve(null),
  ])

  const mlbPayload = mlbGsimResultsSchema.safeParse(latestMlb?.payload)
  const mlbProjected = mlbPayload.success
    ? mlbPayload.data.games.filter((game) => game.context === 'PREGAME_MODEL').length : 0
  const mlbUnavailable = mlbPayload.success
    ? mlbPayload.data.games.filter((game) => game.context === 'UNAVAILABLE').length : 0

  return (
    <main style={{ maxWidth: 1120, margin: '40px auto', padding: 16 }}>
      <p style={{ margin: 0, color: '#8aa0b6', fontWeight: 700 }}>QSC workspace</p>
      <h1 style={{ margin: '6px 0 8px' }}>Model operations</h1>
      <p style={{ marginTop: 0, maxWidth: 720, opacity: 0.8 }}>
        Current private model snapshots, performance evidence, content review, and personal tracking.
      </p>

      <section aria-label="Model status" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 16, marginTop: 28,
      }}>
        <article style={card}>
          <p style={{ color: '#8aa0b6', margin: 0, fontWeight: 700 }}>MLB GSIM</p>
          <h2 style={{ margin: '8px 0' }}>{latestMlb?.slateDate ?? 'No snapshot received'}</h2>
          {mlbPayload.success ? (
            <p>{mlbProjected} current pregame projections · {mlbUnavailable} unavailable</p>
          ) : <p style={{ opacity: 0.75 }}>Waiting for a validated MLB snapshot.</p>}
          {latestMlb && <p style={{ opacity: 0.65, fontSize: 13 }}>Generated {latestMlb.generatedAt.toLocaleString()}</p>}
          <nav style={links} aria-label="MLB tools">
            <Link href="/dashboard/mlb" style={action}>View model</Link>
            <Link href="/dashboard/mlb/performance" style={action}>Performance</Link>
            <Link href="/dashboard/mlb/markets" style={action}>Market comparison</Link>
          </nav>
        </article>

        <article style={card}>
          <p style={{ color: '#8aa0b6', margin: 0, fontWeight: 700 }}>NFL GSIM</p>
          <h2 style={{ margin: '8px 0' }}>
            {latestNfl ? `${latestNfl.season} Week ${latestNfl.week}` : 'No snapshot received'}
          </h2>
          {latestNfl ? <>
            <p>{latestNfl._count.games} accepted games · {latestNfl._count.blockedGames} blocked</p>
            <p style={{ opacity: 0.65, fontSize: 13 }}>Generated {latestNfl.generatedAt.toLocaleString()}</p>
          </> : <p style={{ opacity: 0.75 }}>Waiting for a validated NFL snapshot.</p>}
          <nav style={links} aria-label="NFL tools">
            <Link href="/dashboard/nfl" style={action}>View model</Link>
            <Link href="/dashboard/nfl/performance" style={action}>Performance</Link>
          </nav>
        </article>

        {contentReviewer && <article style={card}>
          <p style={{ color: '#8aa0b6', margin: 0, fontWeight: 700 }}>Content operations</p>
          <h2 style={{ margin: '8px 0' }}>{pendingReviews} pending review{pendingReviews === 1 ? '' : 's'}</h2>
          <p style={{ opacity: 0.75 }}>Internal copy decisions only. Public posting remains a separate action.</p>
          <nav style={links} aria-label="Content tools">
            <Link href="/dashboard/content" style={action}>Open review queue</Link>
          </nav>
        </article>}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Personal tracking</h2>
        <nav style={{ ...links, marginBottom: 20 }} aria-label="Personal tools">
          <Link href="/exposure" style={action}>Exposure and PnL</Link>
          <Link href="/betslip" style={action}>Open betslip</Link>
        </nav>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th align="left">Recent bankroll activity</th><th align="left">Kind</th>
              <th align="right">Units</th><th align="left">Notes</th>
            </tr></thead>
            <tbody>
              {bankroll.map((row) => <tr key={row.id}>
                <td>{row.createdAt.toLocaleString()}</td><td>{row.kind}</td>
                <td align="right">{row.units}</td><td>{row.notes ?? '—'}</td>
              </tr>)}
              {!bankroll.length && <tr><td colSpan={4} style={{ opacity: 0.7, paddingTop: 12 }}>
                No bankroll activity yet.
              </td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
