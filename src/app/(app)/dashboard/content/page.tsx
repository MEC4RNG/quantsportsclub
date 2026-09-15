import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { contentDraftPackageSchema } from '@/schemas/contentDraft'

export const dynamic = 'force-dynamic'

async function decide(formData: FormData) {
  'use server'
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin?callbackUrl=/dashboard/content')
  const id = String(formData.get('id') ?? '')
  const decision = String(formData.get('decision') ?? '')
  if (!['COPY_APPROVED', 'REJECTED'].includes(decision)) throw new Error('Invalid decision')
  const row = await prisma.contentDraftPackage.findUnique({
    where: { id },
    select: { payload: true },
  })
  if (!row) throw new Error('Draft package not found')
  const draft = contentDraftPackageSchema.parse(row.payload)
  if (
    decision === 'COPY_APPROVED' &&
    (draft.blockers.length ||
      !draft.posts.length ||
      draft.posts.some((post) => post.copy_status !== 'REVIEWABLE'))
  ) {
    throw new Error('Blocked drafts cannot be approved')
  }
  await prisma.contentDraftPackage.update({
    where: { id },
    data: {
      reviewStatus: decision,
      reviewedBy: session.user?.email ?? session.user?.name ?? 'authenticated-user',
      decisionAt: new Date(),
    },
  })
  revalidatePath('/dashboard/content')
}

export default async function ContentReviewPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin?callbackUrl=/dashboard/content')
  const storedRows = await prisma.contentDraftPackage.findMany({
    orderBy: { reviewedAt: 'desc' },
    take: 100,
  })
  const rows = Array.from(
    new Map(storedRows.map((row) => [row.sourcePayloadHash, row])).values(),
  ).slice(0, 30)
  return (
    <main style={{ maxWidth: 960, margin: '40px auto', padding: 16 }}>
      <h1>Content review queue</h1>
      <p>Internal copy review only. Approval here does not authorize public release or posting.</p>
      {rows.map((row) => {
        const parsed = contentDraftPackageSchema.safeParse(row.payload)
        if (!parsed.success)
          return (
            <article key={row.id}>
              <h2>{row.slateDate}</h2>
              <p>Invalid stored package — review blocked.</p>
            </article>
          )
        const draft = parsed.data
        const approvable =
          !draft.blockers.length &&
          draft.posts.length > 0 &&
          draft.posts.every((post) => post.copy_status === 'REVIEWABLE')
        return (
          <article
            key={row.id}
            style={{ border: '1px solid #334155', borderRadius: 12, padding: 20, margin: '20px 0' }}
          >
            <h2>MLB · {draft.slate_date}</h2>
            <p>
              <strong>{row.reviewStatus.replaceAll('_', ' ')}</strong> · reviewed{' '}
              {row.reviewedAt.toLocaleString()}
            </p>
            <p>
              Source SHA-256: <code>{draft.source_payload_sha256}</code>
            </p>
            {draft.blockers.length > 0 && <p>Withheld: {draft.blockers.join(', ')}</p>}
            {draft.posts.map((post, index) => (
              <section key={`${post.kind}-${post.game_id ?? index}`} style={{ margin: '20px 0' }}>
                <h3>
                  {index + 1}. {post.kind.replaceAll('_', ' ')}
                </h3>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{post.text}</pre>
                <p>
                  {post.conservative_length}/280 · {post.copy_status}
                </p>
              </section>
            ))}
            <form action={decide} style={{ display: 'flex', gap: 12 }}>
              <input type="hidden" name="id" value={row.id} />
              <button name="decision" value="COPY_APPROVED" disabled={!approvable}>
                Approve copy
              </button>
              <button name="decision" value="REJECTED">
                Reject
              </button>
            </form>
            {row.decisionAt && (
              <p>
                Decision recorded {row.decisionAt.toLocaleString()} by {row.reviewedBy}
              </p>
            )}
          </article>
        )
      })}
      {!rows.length && <p>No content packages have been delivered yet.</p>}
    </main>
  )
}
