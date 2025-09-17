'use client'
import { signIn } from "next-auth/react"
export default function SignInPage() {
  return (
    <main style={{maxWidth: 480, margin: "40px auto", padding: 16}}>
      <h2>Sign in</h2>
      <p>Use GitHub to sign in.</p>
      <button onClick={() => signIn("github")} style={{padding: "10px 14px", borderRadius: 10}}>
        Sign in with GitHub
      </button>
    </main>
  )
}
