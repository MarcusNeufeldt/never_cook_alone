import { supabase } from '@/lib/supabase'

export async function updateProfile(userId: string, updates: {
  username?: string
  display_name?: string
  avatar_url?: string
}) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { data: null, error }
  }
}
