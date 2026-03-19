'use server'

import { createClient } from '@/lib/supabase/server'
import { UserProfile } from '@/lib/types'

export async function getMyProfile(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!data) return null
  return { ...data, email: user.email ?? null } as UserProfile
}

export async function updateMyProfile(updates: {
  display_name?: string
  cellar_name?: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      display_name: updates.display_name?.trim() || null,
      cellar_name: updates.cellar_name?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return {}
}
