'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Clock, Users, Utensils, Copy, Pencil, Trash2, Check, Plus } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { trackRecipeView } from '@/lib/track-recipe-view'
import { motion, AnimatePresence } from 'framer-motion'
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Separator } from "@/components/ui/separator"
import { cn } from '@/lib/utils'
import RecipeComments from '@/components/RecipeComments'
import BottomNav, { TabId } from '@/components/BottomNav'

interface Recipe {
  id: string
  name: string
  description: string
  prep_time_minutes: number
  cook_time_minutes: number
  servings: number
  image_url: string | null
  steps?: {
    id: number
    step_number: number
    instruction: string
    image_url?: string
  }[]
  ingredients?: {
    id: string
    name: string
    quantity: number
    unit: string
  }[]
}

interface EditingIngredient {
  id: string
  quantity: number
  unit: string
  name: string
}

interface NewIngredient {
  name: string
  quantity: number
  unit: string
}

interface ApiError extends Error {
  status?: number;
  message: string;
}

export default function RecipePage({ params }: { params: { id: string } }) {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [showDeleteAlert, setShowDeleteAlert] = useState<string | null>(null)
  const [editingIngredient, setEditingIngredient] = useState<EditingIngredient | null>(null)
  const [newIngredient, setNewIngredient] = useState<NewIngredient | null>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('recipes')
  const router = useRouter()
  const { toast } = useToast()
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768); // Adjust the breakpoint as needed
    };

    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);


  useEffect(() => {
    async function fetchRecipe() {
      try {
        // Wait briefly to allow session refresh
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
          console.error('Session error:', sessionError)
          router.push('/login')
          return
        }

        if (!sessionData.session?.user) {
          // Try refreshing session once before redirecting
          const { data: refreshedSession } = await supabase.auth.refreshSession()
          if (!refreshedSession.session?.user) {
            router.push('/login')
            return
          }
        }

        if (!sessionData.session?.user) {
          console.error('No user in session')
          router.push('/login')
          return
        }

        console.log('Session user:', sessionData.session.user);
        
        // Get the user's profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', sessionData.session.user.id)
          .single();
          
        if (profileError) {
          console.error('Error fetching user profile:', profileError);
          return;
        }
          
        console.log('User profile:', profileData);

        setCurrentUserId(sessionData.session.user.id)

        // Fetch recipe details
        const { data: recipeData, error: recipeError } = await supabase
          .from('recipes')
          .select(`
            *,
            recipe_ingredients (
              quantity,
              unit,
              ingredients (
                id,
                name
              )
            ),
            recipe_steps (
              id,
              step_number,
              instruction,
              image_url
            )
          `)
          .eq('id', params.id)
          .order('step_number', { referencedTable: 'recipe_steps' })
          .single()

        if (recipeError) throw recipeError

        // Transform the ingredients data
        const ingredients = recipeData.recipe_ingredients.map((item: {
          ingredients: {
            id: string;
            name: string;
          };
          quantity: number;
          unit: string;
        }) => ({
          id: item.ingredients.id,
          name: item.ingredients.name,
          quantity: item.quantity,
          unit: item.unit
        }))

        // Transform the steps data
        const steps = recipeData.recipe_steps || []

        setRecipe({ ...recipeData, ingredients, steps })

        // Track the recipe view
        await trackRecipeView(supabase, params.id)
      } catch (error: unknown) {
        console.error('Error fetching recipe:', error)
        if (error && typeof error === 'object' && 'status' in error && (error as ApiError).status === 401) {
          router.push('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchRecipe()
  }, [params.id, router])

  const copyIngredientsToClipboard = () => {
    if (!recipe?.ingredients) return

    const ingredientsList = recipe.ingredients
      .map(ing => `${ing.quantity} ${ing.unit} ${ing.name}`)
      .join('\n')

    navigator.clipboard.writeText(ingredientsList)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
    toast({
      title: "Copied!",
      description: "Ingredients list copied to clipboard",
    })
  }


  const handleDeleteIngredient = async (ingredientId: string) => {
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', params.id)
        .eq('ingredient_id', ingredientId)

      if (error) throw error

      // Update local state
      setRecipe(prev => {
        if (!prev) return null
        return {
          ...prev,
          ingredients: prev.ingredients?.filter(ing => ing.id !== ingredientId)
        }
      })

      toast({
        title: "Ingredient removed",
        description: "The ingredient has been removed from the recipe",
      })
      setShowDeleteAlert(null)
    } catch (error: unknown) {
      console.error('Error deleting ingredient:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while deleting the ingredient",
        variant: "destructive",
      })
    }
  }

  const handleEditIngredient = (ingredient: EditingIngredient) => {
    setEditingIngredient(ingredient)
  }

  const handleSaveIngredient = async () => {
    if (!editingIngredient) return

    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .update({
          quantity: editingIngredient.quantity,
          unit: editingIngredient.unit
        })
        .eq('recipe_id', params.id)
        .eq('ingredient_id', editingIngredient.id)

      if (error) throw error

      // Update local state
      setRecipe(prev => {
        if (!prev) return null
        return {
          ...prev,
          ingredients: prev.ingredients?.map(ing =>
            ing.id === editingIngredient.id
              ? {
                ...ing,
                quantity: editingIngredient.quantity,
                unit: editingIngredient.unit
              }
              : ing
          )
        }
      })

      toast({
        title: "Ingredient updated",
        description: "The ingredient has been updated successfully",
      })
      setEditingIngredient(null)
    } catch (error: unknown) {
      console.error('Error updating ingredient:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while updating the ingredient",
        variant: "destructive",
      })
    }
  }

  const handleAddIngredient = async () => {
    if (!newIngredient?.name || !newIngredient?.quantity || !newIngredient?.unit) {
      toast({
        title: "Invalid input",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      // First, create or get the ingredient
      const { data: ingredientData, error: ingredientError } = await supabase
        .from('ingredients')
        .select('id')
        .eq('name', newIngredient.name)
        .single()

      let ingredientId: number
      if (ingredientError) {
        // Ingredient doesn't exist, create it
        const { data: newIngredientData, error: createError } = await supabase
          .from('ingredients')
          .insert([{ name: newIngredient.name }])
          .select('id')
          .single()

        if (createError) throw createError
        ingredientId = newIngredientData.id
      } else {
        ingredientId = ingredientData.id
      }

      // Then, add the recipe_ingredient relationship
      const { error: relationError } = await supabase
        .from('recipe_ingredients')
        .insert([{
          recipe_id: params.id,
          ingredient_id: ingredientId,
          quantity: newIngredient.quantity,
          unit: newIngredient.unit
        }])

      if (relationError) throw relationError

      // Update local state
      setRecipe(prev => {
        if (!prev) return null
        return {
          ...prev,
          ingredients: [...(prev.ingredients || []), {
            id: ingredientId.toString(),
            name: newIngredient.name,
            quantity: newIngredient.quantity,
            unit: newIngredient.unit
          }]
        }
      })

      toast({
        title: "Ingredient added",
        description: "The new ingredient has been added to the recipe",
      })
      setNewIngredient(null)
    } catch (error: unknown) {
      console.error('Error adding ingredient:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred while adding the ingredient",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <Skeleton className="h-10 w-32" />
        <div className="grid md:grid-cols-2 gap-8">
          <Skeleton className="aspect-square rounded-lg" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-6 w-32" />
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!recipe) {
    return <div className="text-center py-8">Recipe not found</div>
  }

  // Split instructions into steps, removing empty lines and splitting by period
  const steps = recipe.steps?.map(step => step.instruction) || []

  return (
    <div className="container mx-auto px-4 pb-24">
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto p-6"
      >
          <Button
              variant="ghost"
              className="mb-6 hover:scale-105 transition-transform"
              onClick={() => router.back()}
          >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Recipes
          </Button>

          <div className={cn("grid md:grid-cols-2 gap-12", isMobile ? "grid-cols-1" : "")}>
              <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="relative aspect-square rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                  <Image
                      src={recipe.image_url || '/placeholder.svg?height=600&width=600'}
                      alt={recipe.name}
                      fill
                      className="object-cover"
                      priority
                  />
              </motion.div>

              <div className="space-y-8">
                  <div>
                      <motion.h1
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-5xl font-bold mb-3 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent"
                      >
                          {recipe.name}
                      </motion.h1>
                      <p className="text-gray-600 text-lg leading-relaxed">{recipe.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                      {recipe.prep_time_minutes && (
                          <Badge variant="secondary" className="py-2 px-4 bg-gray-50 text-gray-800 hover:bg-gray-100 transition-colors shadow-sm">
                              <Clock className="mr-2 h-4 w-4" />
                              <span>Prep: {recipe.prep_time_minutes} mins</span>
                          </Badge>
                      )}
                      {recipe.cook_time_minutes && (
                          <Badge variant="secondary" className="py-2 px-4 bg-gray-50 text-gray-800 hover:bg-gray-100 transition-colors shadow-sm">
                              <Utensils className="mr-2 h-4 w-4" />
                              <span>Cook: {recipe.cook_time_minutes} mins</span>
                          </Badge>
                      )}
                      {recipe.servings && (
                          <Badge variant="secondary" className="py-2 px-4 bg-gray-50 text-gray-800 hover:bg-gray-100 transition-colors shadow-sm">
                              <Users className="mr-2 h-4 w-4" />
                              <span>Serves: {recipe.servings}</span>
                          </Badge>
                      )}
                  </div>

                <div className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-semibold text-gray-900">Ingredients</h2>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={copyIngredientsToClipboard}
                                    className="hover:scale-105 transition-transform"
                                >
                                    {isCopied ? (
                                        <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setNewIngredient({ name: '', quantity: 1, unit: '' })}
                                    className="hover:scale-105 transition-transform"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                        <ul className="space-y-4">
                            {recipe.ingredients?.map((ingredient) => (
                                <motion.li
                                    key={ingredient.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                     className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-md transition-colors group"
                                >
                                    <span className="flex-grow">
                                        <span className="font-medium mr-2 text-gray-900">
                                            {ingredient.quantity} {ingredient.unit}
                                        </span>
                                        <span className="text-gray-700">{ingredient.name}</span>
                                    </span>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleEditIngredient(ingredient)}
                                            className="h-8 w-8 hover:scale-105 transition-transform"
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowDeleteAlert(ingredient.id)}
                                           className="h-8 w-8 hover:scale-105 transition-transform text-red-500 hover:text-red-600"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </motion.li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>


          <Separator className="my-10" />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
              className="mt-12"
          >
                <h2 className="text-3xl font-semibold mb-8 text-gray-900">Instructions</h2>
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                      <div className="flex items-center justify-between p-6 border-b">
                          <Button
                              variant="outline"
                              onClick={() => setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length)}
                              disabled={steps.length <= 1}
                              className="hover:scale-105 transition-transform"
                          >
                              <ChevronLeft className="h-4 w-4 mr-2" />
                              Previous
                          </Button>
                          <Badge variant="secondary" className="px-4 py-2 text-gray-800 bg-gray-50">
                              Step {currentStep + 1} of {steps.length}
                          </Badge>
                          <Button
                              variant="outline"
                              onClick={() => setCurrentStep((prev) => (prev + 1) % steps.length)}
                              disabled={steps.length <= 1}
                              className="hover:scale-105 transition-transform"
                          >
                              Next
                              <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                      </div>
                      <AnimatePresence mode="wait">
                          <motion.div
                              key={currentStep}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="p-8"
                          >
                              <div className="relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-white opacity-80 rounded-xl pointer-events-none"></div>
                                  <div className="relative z-10 p-4 rounded-xl">
                                      <p className="text-xl leading-relaxed text-gray-800">{steps[currentStep]}.</p>
                                  </div>
                              </div>
                          </motion.div>
                      </AnimatePresence>
                  </CardContent>
              </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
              className="mt-12"
          >
            <RecipeComments 
              recipeId={params.id} 
              currentUserId={currentUserId || undefined} 
            />
          </motion.div>

          <AlertDialog open={!!showDeleteAlert} onOpenChange={() => setShowDeleteAlert(null)}>
              <AlertDialogContent>
                  <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure you want to remove this ingredient?</AlertDialogTitle>
                      <AlertDialogDescription>
                          This will remove the ingredient from this recipe. You can always add it back later.
                      </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                          onClick={() => showDeleteAlert && handleDeleteIngredient(showDeleteAlert)}
                          className="bg-red-500 hover:bg-red-600"
                      >
                          Remove
                      </AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>

           <Dialog open={!!editingIngredient} onOpenChange={() => setEditingIngredient(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Ingredient</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="quantity" className="text-right">
                                Quantity
                            </label>
                            <Input
                                id="quantity"
                                type="number"
                                step="0.1"
                                value={editingIngredient?.quantity || ''}
                                onChange={(e) => setEditingIngredient(prev => prev ? {
                                    ...prev,
                                    quantity: parseFloat(e.target.value)
                                } : null)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="unit" className="text-right">
                                Unit
                            </label>
                            <Input
                                id="unit"
                                value={editingIngredient?.unit || ''}
                                onChange={(e) => setEditingIngredient(prev => prev ? {
                                    ...prev,
                                    unit: e.target.value
                                } : null)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingIngredient(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveIngredient}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!newIngredient} onOpenChange={() => setNewIngredient(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Ingredient</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="name" className="text-right">
                                Name
                            </label>
                            <Input
                                id="name"
                                value={newIngredient?.name || ''}
                                onChange={(e) => setNewIngredient(prev => prev ? {
                                    ...prev,
                                    name: e.target.value
                                } : null)}
                                className="col-span-3"
                                placeholder="e.g., Flour"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="new-quantity" className="text-right">
                                Quantity
                            </label>
                            <Input
                                id="new-quantity"
                                type="number"
                                step="0.1"
                                value={newIngredient?.quantity || ''}
                                onChange={(e) => setNewIngredient(prev => prev ? {
                                    ...prev,
                                    quantity: parseFloat(e.target.value)
                                } : null)}
                                className="col-span-3"
                                placeholder="e.g., 2.5"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="new-unit" className="text-right">
                                Unit
                            </label>
                            <Input
                                id="new-unit"
                                value={newIngredient?.unit || ''}
                                onChange={(e) => setNewIngredient(prev => prev ? {
                                    ...prev,
                                    unit: e.target.value
                                } : null)}
                                className="col-span-3"
                                placeholder="e.g., cups"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setNewIngredient(null)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddIngredient}>
                            Add Ingredient
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      </motion.div>
    </div>
  )
}
