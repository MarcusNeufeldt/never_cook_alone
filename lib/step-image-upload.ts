import { supabase } from './supabase'
import { v4 as uuidv4 } from 'uuid'

export async function uploadStepImage(file: File, recipeId: string, stepNumber: number) {
  try {
    // Create a unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExt}`
    // Store in recipe-steps/[recipeId]/[stepNumber]-[fileName]
    const filePath = `recipe-steps/${recipeId}/${stepNumber}-${fileName}`

    // Upload the file to Supabase Storage (using existing 'recipes' bucket)
    const { error: uploadError } = await supabase.storage
      .from('recipes')
      .upload(filePath, file)

    if (uploadError) {
      throw uploadError
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recipes')
      .getPublicUrl(filePath)

    return publicUrl
  } catch (error) {
    console.error('Error uploading step image:', error)
    throw error
  }
}

export async function deleteStepImage(url: string) {
  try {
    // Extract the path from the URL
    const path = url.split('/').slice(-3).join('/')
    
    // Delete the file from storage
    const { error } = await supabase.storage
      .from('recipes')
      .remove([`recipe-steps/${path}`])

    if (error) {
      throw error
    }
  } catch (error) {
    console.error('Error deleting step image:', error)
    throw error
  }
}
