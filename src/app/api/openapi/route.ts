import { NextResponse } from 'next/server'
import { extendZodWithOpenApi, OpenAPIRegistry, generateOpenApiDocument } from 'zod-to-openapi'
import { z } from 'zod'
import { CreateEdge } from '@/schemas/edges'
import { CreateBankrollEntry } from '@/schemas/bankroll'

extendZodWithOpenApi(z)

export async function GET() {
  const registry = new OpenAPIRegistry()

  // Schemas
  registry.register('CreateEdge', CreateEdge)
  registry.register('CreateBankrollEntry', CreateBankrollEntry)

  // Paths
  registry.registerPath({
    method: 'get',
    path: '/api/edges',
    responses: { 200: { description: 'List edges', content: { 'application/json': { schema: z.array(z.object({})) } } } }, // response type left broad
  })
  registry.registerPath({
    method: 'post',
    path: '/api/edges',
    request: { body: { content: { 'application/json': { schema: CreateEdge } } } },
    responses: { 201: { description: 'Created' }, 400: { description: 'Bad Request' }, 429: { description: 'Rate limited' } },
  })
  registry.registerPath({
    method: 'get',
    path: '/api/bankroll',
    responses: { 200: { description: 'List bankroll entries' } },
  })
  registry.registerPath({
    method: 'post',
    path: '/api/bankroll',
    request: { body: { content: { 'application/json': { schema: CreateBankrollEntry } } } },
    responses: { 201: { description: 'Created' }, 400: { description: 'Bad Request' }, 429: { description: 'Rate limited' } },
  })

  const doc = generateOpenApiDocument(registry.definitions, {
    openapi: '3.0.3',
    info: { title: 'QuantSportsClub API', version: '1.0.0' },
    servers: [{ url: process.env.NEXTAUTH_URL || 'http://localhost:3000' }],
  })

  return NextResponse.json(doc)
}
