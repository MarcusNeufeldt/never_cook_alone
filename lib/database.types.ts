export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: number
          name: string
          description: string | null
          slug: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          slug: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          slug?: string
          created_at?: string
        }
      }
      ingredients: {
        Row: {
          id: number
          name: string
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          display_name?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      recipe_ingredients: {
        Row: {
          recipe_id: string
          ingredient_id: number
          quantity: number | null
          unit: string | null
          notes: string | null
        }
        Insert: {
          recipe_id: string
          ingredient_id: number
          quantity?: number | null
          unit?: string | null
          notes?: string | null
        }
        Update: {
          recipe_id?: string
          ingredient_id?: number
          quantity?: number | null
          unit?: string | null
          notes?: string | null
        }
      }
      recipes: {
        Row: {
          id: string
          name: string
          description: string | null
          instructions: string
          prep_time_minutes: number | null
          cook_time_minutes: number | null
          servings: number | null
          difficulty_level: string | null
          is_featured: boolean
          image_url: string | null
          author_id: string
          category_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          instructions: string
          prep_time_minutes?: number | null
          cook_time_minutes?: number | null
          servings?: number | null
          difficulty_level?: string | null
          is_featured?: boolean
          image_url?: string | null
          author_id: string
          category_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          instructions?: string
          prep_time_minutes?: number | null
          cook_time_minutes?: number | null
          servings?: number | null
          difficulty_level?: string | null
          is_featured?: boolean
          image_url?: string | null
          author_id?: string
          category_id?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
