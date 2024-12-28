'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, List, Grid, Trash2, Clock, ChefHat } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/database.types'

type Recipe = Database['public']['Tables']['recipes']['Row'] & {
  category: {
    id: number
    name: string
    slug: string
  }
}
type Category = {
  id: number
  name: string
  slug: string
}

interface Props {
  initialCategory?: number | null;
}

export default function RecipeGallery({ initialCategory }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(initialCategory || null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

    const fetchCategories = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('id, name, slug')
                .order('name')

            if (error) {
                console.error('Error fetching categories:', error);
                throw error;
            }
            setCategories(data || [])
        } catch (error) {
            console.error('Error fetching categories:', error)
        }
    }, []);

    const fetchRecipes = useCallback(async () => {
        try {
            setLoading(true);
            console.log('Fetching recipes with category:', selectedCategory);

            // First, let's check all recipes without filtering
            const { data: allRecipes, error: allError } = await supabase
                .from('recipes')
                .select(`
                  id,
                  name,
                  category_id,
                  category:categories (
                    id,
                    name,
                    slug
                  )
                `);

            if (allError) {
                console.error('Error fetching recipes:', allError);
                return;
            }

            console.log('All recipes with their category_ids:', allRecipes?.map(r => ({
                name: r.name,
                category_id: r.category_id,
                category: r.category
            })));

            // Now fetch with category filter
            let query = supabase
                .from('recipes')
                .select(`
                *,
                category:categories (
                  id,
                  name,
                  slug
                )
              `)
                .order('created_at', { ascending: false });

            if (selectedCategory !== null) {
                console.log('Applying category filter:', selectedCategory, typeof selectedCategory);
                query = query.eq('category_id', selectedCategory);
            }

            const { data, error } = await query;
            console.log('Filtered recipes:', data);

            if (error) {
                console.error('Query error:', error);
                throw error;
            }
            setRecipes(data || []);
        } catch (error) {
            console.error('Error fetching recipes:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory]);


  // Initial load of categories and recipes
  useEffect(() => {
    fetchCategories()
    fetchRecipes()
  }, [fetchCategories, fetchRecipes])

  // Handle category changes from props or URL
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const categoryId = searchParams.get('category')
    
    // Priority: initialCategory prop > URL parameter
    if (initialCategory !== undefined) {
      setSelectedCategory(initialCategory)
    } else if (categoryId) {
      setSelectedCategory(Number(categoryId))
    }
  }, [initialCategory])

  // Fetch recipes whenever selected category changes
  useEffect(() => {
    console.log('Selected category changed to:', selectedCategory);
    fetchRecipes();
  }, [selectedCategory, fetchRecipes])

  

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDeleteRecipe = async (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        const { error } = await supabase
          .from('recipes')
          .delete()
          .eq('id', id)

        if (error) throw error

        setRecipes(recipes.filter(recipe => recipe.id !== id))
      } catch (error) {
        console.error('Error deleting recipe:', error)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-row gap-2 items-center w-full">
        <div className="relative flex-grow min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            type="search"
            placeholder="Search recipes..."
            className="pl-10 pr-4 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'list')} className="flex-shrink-0">
          <ToggleGroupItem value="grid" aria-label="Grid view">
            <Grid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <ScrollArea className="w-full">
        <div className="flex space-x-2 pb-2">
          <Button
            variant={selectedCategory === null ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            All
          </Button>
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {category.name}
            </Button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square rounded-lg overflow-hidden">
              <Skeleton className="w-full h-full" />
            </div>
          ))}
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No recipes found</p>
          {searchQuery && (
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Try adjusting your search or filters
            </p>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in-50 duration-500">
          {filteredRecipes.map((recipe, index) => (
            <Link 
              key={recipe.id} 
              href={`/recipes/${recipe.id}`} 
              className="block transform motion-safe:animate-fadeIn"
              style={{ 
                animationDelay: `${index * 50}ms`,
                viewTransitionName: `recipe-card-${recipe.id}`
              }}
            >
              <div className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer bg-gray-100 dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 ease-out">
                <Image
                  src={recipe.image_url || '/placeholder.svg?height=300&width=300'}
                  alt={recipe.name}
                  layout="fill"
                  objectFit="cover"
                  className="transition-all duration-500 ease-out group-hover:scale-105 md:group-hover:scale-105 scale-100"
                />
                <div 
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent 
                           opacity-80 transition-opacity duration-300 md:opacity-80 md:group-hover:opacity-100"
                />
                <div className="absolute inset-0 p-4 flex flex-col justify-end transform transition-transform duration-300 ease-out">
                  <div className="flex gap-2 mb-2 transform md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300 delay-100 translate-y-0 opacity-100">
                    {recipe.cook_time_minutes && (
                      <Badge variant="secondary" className="bg-white/90 text-black font-medium shadow-sm">
                        <Clock className="h-3 w-3 mr-1" />
                        {recipe.cook_time_minutes}m
                      </Badge>
                    )}
                    {recipe.difficulty_level && (
                      <Badge variant="secondary" className="bg-white/90 text-black font-medium shadow-sm">
                        <ChefHat className="h-3 w-3 mr-1" />
                        {recipe.difficulty_level}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-white text-lg font-semibold transform transition-transform duration-300 drop-shadow-md">
                    {recipe.name}
                  </h3>
                  {recipe.description && (
                    <p className="text-white/90 text-sm mt-1 line-clamp-2 transform md:translate-y-4 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300 delay-100 drop-shadow translate-y-0 opacity-100">
                      {recipe.description}
                    </p>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 scale-90 md:group-hover:opacity-100 md:group-hover:scale-100 transition-all duration-300 z-10 md:opacity-0 opacity-100 scale-100"
                  onClick={(e) => handleDeleteRecipe(recipe.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete recipe</span>
                </Button>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecipes.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
              <div className="flex items-center space-x-4 p-4 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200 relative group">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <Image
                    src={recipe.image_url || '/placeholder.svg?height=80&width=80'}
                    alt={recipe.name}
                    layout="fill"
                    objectFit="cover"
                    className="rounded-md"
                  />
                </div>
                <div className="flex-grow min-w-0">
                  <h3 className="text-lg font-semibold truncate">{recipe.name}</h3>
                  <div className="flex gap-2 mt-1 mb-2">
                    {recipe.cook_time_minutes && (
                      <Badge variant="secondary" className="bg-gray-200">
                        <Clock className="h-3 w-3 mr-1" />
                        {recipe.cook_time_minutes}m
                      </Badge>
                    )}
                    {recipe.difficulty_level && (
                      <Badge variant="secondary" className="bg-gray-200">
                        <ChefHat className="h-3 w-3 mr-1" />
                        {recipe.difficulty_level}
                      </Badge>
                    )}
                  </div>
                  {recipe.description && (
                    <p className="text-sm text-gray-600 line-clamp-1">{recipe.description}</p>
                  )}
                </div>
                <Button
                  variant="destructive"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  onClick={(e) => handleDeleteRecipe(recipe.id, e)}
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">Delete recipe</span>
                </Button>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}