import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { session, redirect, edgeFindMany, bankrollFindMany } = vi.hoisted(() => ({
  session: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT ${url}`)
  }),
  edgeFindMany: vi.fn(),
  bankrollFindMany: vi.fn(),
}))

vi.mock('next-auth', () => ({ getServerSession: session }))
vi.mock('next/navigation', () => ({ redirect }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/lib/db', () => ({
  prisma: {
    edge: { findMany: edgeFindMany },
    bankrollEntry: { findMany: bankrollFindMany },
  },
}))

import DashboardLayout from '@/app/(app)/dashboard/layout'
import DashboardPage from '@/app/(app)/dashboard/page'

vi.stubGlobal('React', React)

describe('dashboard authentication', () => {
  beforeEach(() => {
    session.mockReset()
    redirect.mockClear()
    edgeFindMany.mockReset()
    bankrollFindMany.mockReset()
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
    edgeFindMany.mockResolvedValue([])
    bankrollFindMany.mockResolvedValue([])
    await DashboardPage()
    expect(bankrollFindMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
  })
})
