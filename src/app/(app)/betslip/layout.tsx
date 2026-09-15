import { redirect } from 'next/navigation'
import { getSessionUserId } from '@/lib/sessionUser'

export const dynamic = 'force-dynamic'

export default async function BetslipLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSessionUserId())) redirect('/auth/signin?callbackUrl=/betslip')
  return children
}
