import { afterEach, expect, it, vi } from 'vitest'
import { loadOfficialResults } from '@/lib/mlbOfficialResults'
afterEach(() => vi.unstubAllGlobals())
it('reports source failures without inventing finals', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
  const result = await loadOfficialResults(['2026-09-11'])
  expect(result.games.size).toBe(0)
  expect(result.unavailable).toEqual(['2026-09-11'])
})
it('deduplicates date requests and rejects malformed source data', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ unexpected: [] }) })
  vi.stubGlobal('fetch', fetcher)
  const result = await loadOfficialResults(['2026-09-11', '2026-09-11'])
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(result.unavailable).toHaveLength(1)
})
