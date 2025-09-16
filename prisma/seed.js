/* eslint-disable */
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // demo user
  const user = await prisma.user.upsert({
    where: { email: 'demo@qsc.local' },
    update: {},
    create: { email: 'demo@qsc.local', name: 'Demo User' },
  })

  // demo model run + edge
  const run = await prisma.modelRun.create({
    data: { name: 'baseline', version: 'v1' },
  })

  await prisma.edge.create({
    data: {
      sport: 'NFL',
      league: 'NFL',
      market: 'spread',
      pick: 'NYJ +3.5',
      edgePct: 2.7,
      modelRunId: run.id,
    },
  })

  // demo bankroll entry
  await prisma.bankrollEntry.create({
    data: { userId: user.id, kind: 'deposit', units: 1000, notes: 'Initial roll' },
  })

  console.log('Seed complete.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
