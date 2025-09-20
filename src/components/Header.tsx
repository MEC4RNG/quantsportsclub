// src/components/Header.tsx
'use client'

import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'

export default function Header() {
  const { data: session, status } = useSession()

  return (
    <header style={{
      display:'flex', alignItems:'center', justifyContent:'space-between',
      padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.12)'
    }}>
      <nav style={{display:'flex', gap:12}}>
        <Link href="/">Home</Link>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/exposure">Exposure</Link>
        <Link href="/betslip">Betslip</Link>
      </nav>
      <div style={{display:'flex', gap:12, alignItems:'center'}}>
        {status === 'authenticated' ? (
          <>
            <span style={{opacity:.8}}>
              {session?.user?.name ?? session?.user?.email ?? 'Signed in'}
            </span>
            <button onClick={() => signOut({ callbackUrl: '/' })}>
              Sign out
            </button>
          </>
        ) : (
          <button onClick={() => signIn('github')}>Sign in</button>
        )}
      </div>
    </header>
  )
}
