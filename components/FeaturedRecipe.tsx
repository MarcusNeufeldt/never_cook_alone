'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Clock, Users } from 'lucide-react'
import { Card, CardContent } from "@/components/ui/card"
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/database.types'

type Recipe = Database['public']['Tables']['recipes']['Row']

export default function FeaturedRecipe() {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFeaturedRecipe()
    
    // Refresh the featured recipe every 60 seconds
    const interval = setInterval(fetchFeaturedRecipe, 60000)
    return () => clearInterval(interval)
  }, [])

  async function fetchFeaturedRecipe() {
    try {
      // Get a random featured recipe
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_featured', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data && data.length > 0) {
        // Select a random recipe from the featured ones
        const randomIndex = Math.floor(Math.random() * data.length)
        setRecipe(data[randomIndex])
      }
    } catch (error) {
      console.error('Error fetching featured recipe:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full bg-gray-100 animate-pulse">
        <div className="aspect-video" />
      </Card>
    )
  }

  if (!recipe) {
    return null
  }

  return (
    <Link href={`/recipes/${recipe.id}`}>
      <Card className="w-full overflow-hidden group cursor-pointer">
        <div className="relative aspect-video">
          <Image
            src={recipe.image_url || '/placeholder.svg?height=400&width=800'}
            alt={recipe.name}
            layout="fill"
            objectFit="cover"
            className="transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        <CardContent className="relative -mt-20 bg-gradient-to-t from-black via-black/60 to-transparent text-white p-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{recipe.name}</h2>
            {recipe.description && (
              <p className="text-gray-200 line-clamp-2">{recipe.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-200">
              {recipe.prep_time_minutes && (
                <div className="flex items-center">
                  <Clock className="mr-1 h-4 w-4" />
                  <span>Prep: {recipe.prep_time_minutes}m</span>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center">
                  <Users className="mr-1 h-4 w-4" />
                  <span>Serves: {recipe.servings}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
