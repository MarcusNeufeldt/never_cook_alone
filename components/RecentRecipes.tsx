'use client'

import { Clock, ChevronRight, History } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Card, CardContent } from "@/components/ui/card"

type Recipe = {
  id: string
  name: string
  prep_time_minutes: number
  image_url: string | null
  viewed_at: string
  category: {
    name: string
    slug: string
  } | null
}

interface RecipeView {
  recipe_id: string
  viewed_at: string
  recipes: {
    id: string
    name: string
    prep_time_minutes: number
    image_url: string | null
    category: {
      name: string
      slug: string
    } | null
  }
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export default function RecentRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRecentRecipes = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.log('No active session')
          return
        }

        const { data, error } = await supabase
          .from('latest_recipe_views')
          .select(`
            recipe_id,
            viewed_at,
            recipes (
              id,
              name,
              prep_time_minutes,
              image_url,
              category:categories (
                name,
                slug
              )
            )
          `)
          .eq('user_id', user.id)
          .order('viewed_at', { ascending: false })
          .limit(4)

        if (error) throw error

        const transformedData = (data as unknown[])
          .filter((item): item is RecipeView => (item as RecipeView).recipes != null)
          .map(item => ({
            id: item.recipes.id,
            name: item.recipes.name,
            prep_time_minutes: item.recipes.prep_time_minutes,
            image_url: item.recipes.image_url,
            category: item.recipes.category,
            viewed_at: item.viewed_at
          }))

        setRecipes(transformedData)
      } catch (error) {
        console.error('Error fetching recent recipes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRecentRecipes()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      fetchRecentRecipes()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
            <History className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
            Recent Recipes
          </h2>
          <div className="space-y-3 sm:space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-center space-x-3 sm:space-x-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-200 rounded-lg animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 sm:h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
                  <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/4 mt-2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (recipes.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
            <History className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
            Recent Recipes
          </h2>
          <div className="bg-orange-50 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center">
            <p className="text-sm sm:text-base text-gray-600">No recipes viewed yet. Start exploring!</p>
            <Link 
              href="/recipes" 
              className="mt-3 sm:mt-4 inline-block text-sm sm:text-base text-orange-600 hover:text-orange-700 font-medium"
            >
              Browse Recipes →
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardContent className="p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
          <History className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
          Recent Recipes
        </h2>
        <motion.div 
          className="space-y-3 sm:space-y-4"
          variants={container}
          initial="hidden"
          animate="show"
        >
          {recipes.map((recipe) => (
            <motion.div key={recipe.id} variants={item}>
              <Link href={`/recipes/${recipe.id}`}>
                <div className="group hover:bg-orange-50 bg-gray-50 rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all duration-200 transform hover:scale-[1.02]">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={recipe.image_url || '/placeholder.svg'}
                        alt={recipe.name}
                        fill
                        className="object-cover transition-transform duration-200 group-hover:scale-110"
                        sizes="(max-width: 640px) 64px, 80px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                        {recipe.name}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-gray-400" />
                          {recipe.prep_time_minutes} min
                        </span>
                        {recipe.category && (
                          <span className="capitalize">{recipe.category.name}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0" />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </CardContent>
    </Card>
  )
}
