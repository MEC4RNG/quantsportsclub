import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { contentDraftPackageSchema } from '@/schemas/contentDraft'
import styles from './content.module.css'

export const dynamic = 'force-dynamic'

async function decide(formData: FormData) {
  'use server'
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/signin?callbackUrl=/dashboard/content')
  if ((session.user as { contentReviewer?: boolean } | undefined)?.contentReviewer !== true)
    redirect('/dashboard')
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
  if ((session.user as { contentReviewer?: boolean } | undefined)?.contentReviewer !== true)
    redirect('/dashboard')
  const storedRows = await prisma.contentDraftPackage.findMany({
    orderBy: { reviewedAt: 'desc' },
    take: 100,
  })
  const rows = Array.from(
    new Map(storedRows.map((row) => [row.sourcePayloadHash, row])).values(),
  ).slice(0, 30)
  return (
    <main className={styles.main}>
      <Link className={styles.back} href="/dashboard">
        ← Overview
      </Link>
      <h1>Content review queue</h1>
      <p className={styles.intro}>
        Internal copy review only. Approval here does not authorize public release or posting.
      </p>
      {rows.map((row) => {
        const parsed = contentDraftPackageSchema.safeParse(row.payload)
        if (!parsed.success)
          return (
            <article className={styles.card} key={row.id}>
              <h2>{row.slateDate}</h2>
              <p className={styles.blocker}>Invalid stored package — review blocked.</p>
            </article>
          )
        const draft = parsed.data
        const approvable =
          !draft.blockers.length &&
          draft.posts.length > 0 &&
          draft.posts.every((post) => post.copy_status === 'REVIEWABLE')
        return (
          <article className={styles.card} key={row.id}>
            <div className={styles.cardHeader}>
              <h2>MLB · {draft.slate_date}</h2>
              <span className={styles.status}>{row.reviewStatus.replaceAll('_', ' ')}</span>
            </div>
            <p className={styles.meta}>Reviewed {row.reviewedAt.toLocaleString()}</p>
            <p className={styles.meta}>
              Source SHA-256: <code className={styles.hash}>{draft.source_payload_sha256}</code>
            </p>
            {draft.blockers.length > 0 && (
              <p className={styles.blocker}>Withheld: {draft.blockers.join(', ')}</p>
            )}
            {draft.posts.map((post, index) => (
              <section className={styles.post} key={`${post.kind}-${post.game_id ?? index}`}>
                <h3>
                  {index + 1}. {post.kind.replaceAll('_', ' ')}
                </h3>
                <pre className={styles.copy}>{post.text}</pre>
                <p className={styles.meta}>
                  {post.conservative_length}/280 · {post.copy_status}
                </p>
              </section>
            ))}
            <form action={decide} className={styles.actions}>
              <input type="hidden" name="id" value={row.id} />
              <button name="decision" value="COPY_APPROVED" disabled={!approvable}>
                Approve copy
              </button>
              <button name="decision" value="REJECTED">
                Reject
              </button>
            </form>
            {row.decisionAt && (
              <p className={styles.meta}>
                Decision recorded {row.decisionAt.toLocaleString()} by {row.reviewedBy}
              </p>
            )}
          </article>
        )
      })}
      {!rows.length && (
        <p className={styles.empty}>No content packages have been delivered yet.</p>
      )}
    </main>
  )
}
