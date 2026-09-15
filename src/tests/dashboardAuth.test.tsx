import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { session, redirect, mlbFindFirst, nflFindFirst, bankrollFindMany, contentCount } = vi.hoisted(() => ({
  session: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`)
  }),
  mlbFindFirst: vi.fn(),
  nflFindFirst: vi.fn(),
  bankrollFindMany: vi.fn(),
  contentCount: vi.fn(),
}))

vi.mock('next-auth', () => ({ getServerSession: session }))
vi.mock('next/navigation', () => ({ redirect }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/db', () => ({
  prisma: {
    mlbGsimResult: { findFirst: mlbFindFirst },
    nflGsimResult: { findFirst: nflFindFirst },
    bankrollEntry: { findMany: bankrollFindMany },
    contentDraftPackage: { count: contentCount },
  },
}))

import DashboardLayout from '@/app/(app)/dashboard/layout'
import DashboardPage from '@/app/(app)/dashboard/page'

vi.stubGlobal('React', React)

describe('dashboard authentication', () => {
  beforeEach(() => {
    session.mockReset()
    redirect.mockClear()
    mlbFindFirst.mockReset().mockResolvedValue(null)
    nflFindFirst.mockReset().mockResolvedValue(null)
    bankrollFindMany.mockReset()
    contentCount.mockReset().mockResolvedValue(0)
  })

  it('redirects anonymous dashboard requests before rendering children', async () => {
    session.mockResolvedValue(null)
    await expect(DashboardLayout({ children: 'private' })).rejects.toThrow(
      'REDIRECT /auth/signin?callbackUrl=/dashboard',
    )
  })

  it('renders dashboard children for a valid session', async () => {
    session.mockResolvedValue({ user: { id: 'user-1' } })
    await expect(DashboardLayout({ children: 'private' })).resolves.toBe('private')
  })

  it('queries bankroll entries only for the signed-in user', async () => {
    session.mockResolvedValue({ user: { id: 'user-1' } })
    bankrollFindMany.mockResolvedValue([])
    const page = await DashboardPage()
    const html = renderToStaticMarkup(page)
    expect(html).toContain('Model operations')
    expect(html).toContain('MLB GSIM')
    expect(html).toContain('NFL GSIM')
    expect(bankrollFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })
  })

  it('shows content workload only to configured reviewers', async () => {
    session.mockResolvedValue({ user: { id: 'user-1', contentReviewer: true } })
    bankrollFindMany.mockResolvedValue([])
    contentCount.mockResolvedValue(2)
    const html = renderToStaticMarkup(await DashboardPage())
    expect(html).toContain('2 pending reviews')
    expect(contentCount).toHaveBeenCalledWith({ where: { reviewStatus: 'PENDING_REVIEW' } })
  })
})
