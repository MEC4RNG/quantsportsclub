import { NextResponse } from 'next/server'
import * as z from 'zod'
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from '@asteasolutions/zod-to-openapi'

import { CreateEdge } from '@/schemas/edges'
import { CreateBankrollEntry } from '@/schemas/bankroll'
import { CreateBet, SettleBet } from '@/schemas/bets'

extendZodWithOpenApi(z)

export async function GET() {
  const registry = new OpenAPIRegistry()

  // ---------- Schemas ----------
  registry.register('CreateEdge', CreateEdge)
  registry.register('CreateBankrollEntry', CreateBankrollEntry)
  registry.register('CreateBet', CreateBet)
  registry.register('SettleBet', SettleBet)

  // ---------- Paths ----------
  // Edges
  registry.registerPath({
    method: 'get',
    path: '/api/edges',
    responses: { 200: { description: 'List edges' } },
  })
  registry.registerPath({
    method: 'post',
    path: '/api/edges',
    request: { body: { content: { 'application/json': { schema: CreateEdge } } } },
    responses: {
      201: { description: 'Created' },
      400: { description: 'Bad Request' },
      429: { description: 'Rate limited' },
    },
  })

  // Bankroll
  registry.registerPath({
    method: 'get',
    path: '/api/bankroll',
    responses: { 200: { description: 'List bankroll entries' } },
  })
  registry.registerPath({
    method: 'post',
    path: '/api/bankroll',
    request: { body: { content: { 'application/json': { schema: CreateBankrollEntry } } } },
    responses: {
      201: { description: 'Created' },
      400: { description: 'Bad Request' },
      429: { description: 'Rate limited' },
    },
  })

  // Bets
  registry.registerPath({
    method: 'get',
    path: '/api/bets',
    responses: { 200: { description: 'List bets' } },
  })
  registry.registerPath({
    method: 'post',
    path: '/api/bets',
    request: { body: { content: { 'application/json': { schema: CreateBet } } } },
    responses: {
      201: { description: 'Created' },
      400: { description: 'Bad Request' },
      429: { description: 'Rate limited' },
    },
  })

  // Bets – settle (v7: params go under request.params)
  registry.registerPath({
    method: 'post',
    path: '/api/bets/{id}/settle',
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { 'application/json': { schema: SettleBet } } },
    },
    responses: {
      200: { description: 'Settled' },
      400: { description: 'Bad Request' },
      429: { description: 'Rate limited' },
    },
  })

  // ---------- Generate (v7 API) ----------
  const generator = new OpenApiGeneratorV3(registry.definitions)
  const doc = generator.generateDocument({
    openapi: '3.0.3',
    info: { title: 'QuantSportsClub API', version: '1.0.0' },
    servers: [{ url: process.env.NEXTAUTH_URL || 'http://localhost:3000' }],
  })

  return NextResponse.json(doc)
}
