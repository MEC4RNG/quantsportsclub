export const dynamic = 'force-dynamic'

import { getCurrentBankrollUnits } from '@/lib/picks'
import Betslip from '@/components/bets/Betslip'

export default async function BetslipPage() {
  const bankroll = await getCurrentBankrollUnits()
  return (
    <main style={{ maxWidth: 900, margin: '40px auto', padding: 16 }}>
      <h1>Betslip</h1>
      <p style={{ opacity: 0.8, marginTop: -6 }}>
        Bankroll: <strong>{bankroll.toFixed(2)}u</strong>
      </p>
      <Betslip initialBankroll={bankroll} />
    </main>
  )
}
