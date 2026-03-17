'use client'

import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client — safe to call in Client Components.
// Reads from NEXT_PUBLIC_* env vars.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
