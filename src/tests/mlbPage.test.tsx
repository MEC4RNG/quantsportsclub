import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it, vi, beforeEach } from 'vitest'
const { session, findFirst } = vi.hoisted(() => ({ session: vi.fn(), findFirst: vi.fn() }))
vi.mock('next-auth', () => ({ getServerSession: session }))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))
vi.mock('@/components/MlbRefresh', () => ({ default: () => null }))
vi.mock('@/lib/db', () => ({ prisma: { mlbGsimResult: { findFirst } } }))
vi.mock('next/navigation', () => ({ redirect: (url: string) => { throw new Error(`REDIRECT ${url}`) } }))
import Page from '@/app/(app)/dashboard/mlb/page'

vi.stubGlobal('React', React)
beforeEach(() => { vi.clearAllMocks() })
it('requires authentication before accessing stored model output', async () => {
  session.mockResolvedValue(null)
  await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('REDIRECT')
  expect(findFirst).not.toHaveBeenCalled()
})
it('selects a complete dated snapshot and renders a truthful empty state', async () => {
  session.mockResolvedValue({ user: { name: 'Test' } })
  findFirst.mockResolvedValue(null)
  const page = await Page({ searchParams: Promise.resolve({ date: '2026-09-11' }) })
  const html = renderToStaticMarkup(page)
  expect(html).toContain('No MLB snapshot for this date')
  expect(findFirst).toHaveBeenCalledWith({ where: { slateDate: '2026-09-11' },
    orderBy: [{ generatedAt: 'desc' }, { receivedAt: 'desc' }] })
})
