import { beforeEach, describe, expect, it, vi } from 'vitest'

const { findFirst } = vi.hoisted(() => ({ findFirst: vi.fn() }))
vi.mock('@/lib/db', () => ({ prisma: { account: { findFirst } } }))

import { contentReviewerGithubIds, isContentReviewer } from '@/lib/contentReviewAccess'

describe('content review access', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    findFirst.mockReset()
  })

  it('parses only stable numeric GitHub account IDs', () => {
    expect(contentReviewerGithubIds(' 183875085, bad, 42, ')).toEqual(['183875085', '42'])
  })

  it('fails closed without an allowlist or user ID', async () => {
    vi.stubEnv('CONTENT_REVIEWER_GITHUB_IDS', '')
    await expect(isContentReviewer('user-1')).resolves.toBe(false)
    vi.stubEnv('CONTENT_REVIEWER_GITHUB_IDS', '183875085')
    await expect(isContentReviewer(undefined)).resolves.toBe(false)
    expect(findFirst).not.toHaveBeenCalled()
  })

  it('requires a matching GitHub account belonging to the session user', async () => {
    vi.stubEnv('CONTENT_REVIEWER_GITHUB_IDS', '183875085')
    findFirst.mockResolvedValueOnce({ id: 'account-1' }).mockResolvedValueOnce(null)
    await expect(isContentReviewer('user-1')).resolves.toBe(true)
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        provider: 'github',
        providerAccountId: { in: ['183875085'] },
      },
      select: { id: true },
    })
    await expect(isContentReviewer('user-2')).resolves.toBe(false)
  })
})
