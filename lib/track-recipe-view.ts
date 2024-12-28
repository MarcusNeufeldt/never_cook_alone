import { SupabaseClient } from '@supabase/supabase-js'

export async function trackRecipeView(
  client: SupabaseClient,
  recipeId: string
) {
  try {
    const { data: { user } } = await client.auth.getUser()
    if (!user) return

    console.log('Tracking view for recipe:', recipeId, 'user:', user.id)

    // Insert a new view record
    const { error, data } = await client
      .from('recipe_views')
      .insert({
        user_id: user.id,
        recipe_id: recipeId,
      })

    console.log('Track recipe view result:', { error, data })

    if (error && error.code !== '23505') { // Ignore unique constraint violations
      console.error('Error tracking recipe view:', error)
    }
  } catch (error) {
    console.error('Error tracking recipe view:', error)
  }
}
