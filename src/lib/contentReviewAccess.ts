import { prisma } from '@/lib/db'

export function contentReviewerGithubIds(value = process.env.CONTENT_REVIEWER_GITHUB_IDS) {
  return (value ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter((id) => /^\d+$/.test(id))
}

export async function isContentReviewer(userId: string | undefined) {
  const providerAccountIds = contentReviewerGithubIds()
  if (!userId || providerAccountIds.length === 0) return false
  const account = await prisma.account.findFirst({
    where: { userId, provider: 'github', providerAccountId: { in: providerAccountIds } },
    select: { id: true },
  })
  return account !== null
}
