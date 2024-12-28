import { supabase } from './supabase'
import { v4 as uuidv4 } from 'uuid'

export async function uploadImage(file: File) {
  try {
    // Create a unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${uuidv4()}.${fileExt}`
    const filePath = `recipe-images/${fileName}`

    // Upload the file to Supabase Storage
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
    console.error('Error uploading image:', error)
    throw error
  }
}
