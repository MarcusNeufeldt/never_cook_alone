'use client'

import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export default function Auth() {
  const handleGoogleLogin = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Error logging in with Google:', error)
    }
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to Never Cook Alone
          </h2>
        </div>
        <button
          onClick={handleGoogleLogin}
          className="group relative flex w-full justify-center rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600"
        >
          Continue with Google
        </button>
      </div>
    </div>
  )
}
