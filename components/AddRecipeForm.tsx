'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from '@/lib/supabase'
import { uploadImage } from '@/lib/image-upload'
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { RecipeIngredientsList } from "@/components/recipe-ingredients-list"
import { RecipeStorySteps } from "@/components/RecipeStorySteps"
import { PenLine, Clock, Users, ChefHat, Camera, Sparkles, Smartphone, X } from 'lucide-react'
import confetti from 'canvas-confetti'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { analyzeRecipeImage } from '@/utils/gemini'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Recipe name must be at least 2 characters.",
  }),
  category_id: z.number({
    required_error: "Please select a category.",
  }),
  description: z.string(),
  ingredients: z.array(z.object({
    id: z.string(),
    name: z.string(),
    quantity: z.number(),
    unit: z.string()
  })).min(1, {
    message: "Please add at least one ingredient.",
  }).default([]),
  instructions: z.array(z.object({
    id: z.string(),
    stepNumber: z.number(),
    instruction: z.string(),
    imageUrl: z.string().optional()
  })).min(1, {
    message: "Please add at least one instruction step.",
  }).default([]),
  prep_time_minutes: z.number().min(0),
  cook_time_minutes: z.number().min(5),
  servings: z.number().min(1),
  difficulty_level: z.enum(["easy", "medium", "hard"]),
})

const steps = [
  { title: "Basics", icon: PenLine, color: "text-blue-500" },
  { title: "Ingredients", icon: ChefHat, color: "text-green-500" },
  { title: "Instructions", icon: Clock, color: "text-yellow-500" },
  { title: "Details", icon: Users, color: "text-purple-500" },
]

const difficultyEmoji: { [key: string]: string } = {
  easy: "😊",
  medium: "😐",
  hard: "😅"
}

export default function AddRecipeForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [ingredients, setIngredients] = useState<{ value: string; label: string }[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [completionPercentage, setCompletionPercentage] = useState(0)
  const [showImageDialog, setShowImageDialog] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      // Fetch ingredients
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('ingredients')
        .select('*')
        .order('name')

      if (ingredientsError) {
        console.error('Error fetching ingredients:', ingredientsError)
      } else {
        setIngredients(ingredients.map(ing => ({
          value: ing.id.toString(),
          label: ing.name
        })))
      }

      // Fetch categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')
        .order('name')

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError)
      } else {
        setCategories(categories || [])
      }
    }

    fetchData()
  }, [])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      category_id: 0,
      description: "",
      ingredients: [],
      instructions: [],
      prep_time_minutes: 0,
      cook_time_minutes: 5,
      servings: 1,
      difficulty_level: "medium",
    },
  })

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      console.log('📸 Image selected:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024).toFixed(2)}KB`
      });

      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = async () => {
        console.log('🔄 Converting image to base64...');
        const base64String = reader.result as string;
        setImagePreview(base64String)
        
        // Extract base64 data without the prefix
        const base64Data = base64String.split(',')[1];
        console.log('✅ Base64 conversion complete:', {
          previewLength: base64String.length,
          dataLength: base64Data.length,
          sample: `${base64Data.slice(0, 50)}...`
        });
      }

      reader.onerror = (error) => {
        console.error('❌ Error reading file:', error);
      };

      console.log('🔄 Starting file read...');
      reader.readAsDataURL(file)
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let image_url = null
      if (imageFile) {
        image_url = await uploadImage(imageFile)
      }

      // Extract ingredients and instructions to insert separately
      const { ingredients, instructions, ...recipeValues } = values;

      // Create recipe first
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert([{
          ...recipeValues,
          author_id: user.id,
          image_url,
          is_featured: false,
        }])
        .select()
        .single()

      if (recipeError) throw recipeError

      // Insert recipe ingredients
      if (ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(
            ingredients.map(ing => ({
              recipe_id: recipe.id,
              ingredient_id: ing.id,
              quantity: ing.quantity,
              unit: ing.unit
            }))
          )

        if (ingredientsError) throw ingredientsError
      }

      // Insert recipe steps
      if (instructions.length > 0) {
        const { error: stepsError } = await supabase
          .from('recipe_steps')
          .insert(
            instructions.map(step => ({
              recipe_id: recipe.id,
              step_number: step.stepNumber,
              instruction: step.instruction,
              image_url: step.imageUrl || null
            }))
          )

        if (stepsError) throw stepsError
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })

      router.push(`/recipes/${recipe.id}`)
      router.refresh()
    } catch (error) {
      console.error('Error creating recipe:', error)
    } finally {
      setLoading(false)
    }
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
      updateCompletionPercentage()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      updateCompletionPercentage()
    }
  }

  const updateCompletionPercentage = useCallback(() => {
    const totalFields = Object.keys(form.getValues()).length
    const filledFields = Object.values(form.getValues()).filter(value => 
      value !== "" && value !== 0 && (Array.isArray(value) ? value.length > 0 : true)
    ).length
    setCompletionPercentage((filledFields / totalFields) * 100)
  }, [form])

  const formValues = form.watch()
  useEffect(() => {
    updateCompletionPercentage();
  }, [formValues, updateCompletionPercentage]);

  return (
    <div className="w-full max-w-4xl mx-auto p-2 space-y-4 animate-in fade-in-50 duration-500">
      <div className="relative">
        <div className="absolute left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 top-[1.75rem] -mx-2" />
        <div className="relative flex justify-between max-w-2xl mx-auto px-4">
          {steps.map((step, index) => (
            <TooltipProvider key={step.title}>
              <Tooltip>
                <TooltipTrigger>
                  <motion.div
                    className={`flex flex-col items-center space-y-1 cursor-pointer ${
                      index === currentStep ? step.color : 'text-gray-400'
                    }`}
                    animate={{ 
                      scale: index === currentStep ? 1.1 : 1,
                      y: index === currentStep ? -2 : 0
                    }}
                    whileHover={{ scale: index < currentStep ? 1.05 : 1 }}
                    onClick={() => index < currentStep && setCurrentStep(index)}
                  >
                    <motion.div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-shadow ${
                        index === currentStep 
                          ? `bg-gradient-to-br from-${step.color.split('-')[1]}-500 to-${step.color.split('-')[1]}-400 shadow-lg ring-2 ring-${step.color.split('-')[1]}-100` 
                          : index < currentStep
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                      whileHover={{ y: index < currentStep ? -2 : 0 }}
                    >
                      {index < currentStep ? (
                        <motion.svg 
                          className="w-5 h-5 text-white" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.5 }}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </motion.svg>
                      ) : (
                        <step.icon className={`w-5 h-5 ${index === currentStep ? 'text-white' : ''}`} />
                      )}
                    </motion.div>
                    <span className="text-xs font-medium">{step.title}</span>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{`Step ${index + 1}: ${step.title}`}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-orange-500 to-orange-400"
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>{Math.round(completionPercentage)}% complete</span>
          <span>{currentStep + 1} of {steps.length}</span>
        </div>
      </div>

      <Card className="relative overflow-hidden border-none ring-1 ring-gray-200 dark:ring-gray-800 shadow-xl bg-white/50 dark:bg-gray-950/50 backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent dark:from-orange-950/20 dark:to-transparent" />
        <CardContent className="relative p-3 sm:p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <AnimatePresence mode="wait">
                {currentStep === 0 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormLabel className="text-gray-700 dark:text-gray-300">Recipe Name</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter recipe name" 
                                  {...field} 
                                  className="border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-orange-500/20 transition-shadow"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="category_id"
                          render={({ field }) => (
                            <FormItem className="w-full sm:w-[200px]">
                              <FormLabel className="text-gray-700 dark:text-gray-300">Category</FormLabel>
                              <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                                <FormControl>
                                  <SelectTrigger className="border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-orange-500/20">
                                    <SelectValue placeholder="Select a category" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {categories.map((category) => (
                                    <SelectItem key={category.id} value={category.id.toString()}>
                                      {category.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-300">Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Describe your culinary creation"
                                className="min-h-[100px] text-base resize-none border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-orange-500/20 transition-shadow"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-3">
                        <FormLabel className="text-gray-700 dark:text-gray-300">Recipe Image</FormLabel>
                        <div className="grid gap-3">
                          {imagePreview ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="relative aspect-video rounded-xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-800 shadow-lg"
                            >
                              <Image
                                src={imagePreview}
                                alt="Recipe preview"
                                fill
                                className="object-cover"
                              />
                              {analyzing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                                  <div className="flex flex-col items-center gap-2 text-white">
                                    <Sparkles className="w-8 h-8 animate-pulse" />
                                    <p className="text-sm font-medium">Analyzing recipe...</p>
                                  </div>
                                </div>
                              )}
                              <div className="absolute top-2 right-2 flex gap-2">
                                <motion.button
                                  type="button"
                                  onClick={async () => {
                                    if (!imagePreview) return;
                                    const base64Data = imagePreview.split(',')[1];
                                    setAnalyzing(true);
                                    try {
                                      const recipeData = await analyzeRecipeImage(base64Data, categories);
                                      if (recipeData) {
                                        form.setValue('name', recipeData.name);
                                        form.setValue('description', recipeData.description);
                                        form.setValue('category_id', recipeData.category_id);
                                        form.setValue('prep_time_minutes', recipeData.prep_time_minutes);
                                        form.setValue('cook_time_minutes', Math.max(5, recipeData.cook_time_minutes));
                                        form.setValue('servings', recipeData.servings);
                                        form.setValue('difficulty_level', recipeData.difficulty_level as "easy" | "medium" | "hard");
                                        
                                        // Process ingredients from AI
                                        console.log('🔍 Processing AI-detected ingredients...');
                                        const formattedIngredients = await Promise.all(recipeData.ingredients.map(async (ing: { name: string; quantity: number; unit: string }) => {
                                          try {
                                            // Add the new ingredient to the database
                                            const { data: newIngredient, error } = await supabase
                                              .from('ingredients')
                                              .insert([{ name: ing.name.trim() }])
                                              .select()
                                              .single();

                                            if (error) {
                                              if (error.code === '23505') { // Unique constraint violation
                                                // Ingredient already exists, fetch it
                                                const { data: existingIngredient } = await supabase
                                                  .from('ingredients')
                                                  .select('*')
                                                  .eq('name', ing.name.trim())
                                                  .single();
                                                
                                                if (existingIngredient) {
                                                  console.log(`✅ Using existing ingredient: "${ing.name}"`);
                                                  return {
                                                    id: existingIngredient.id.toString(),
                                                    name: existingIngredient.name,
                                                    quantity: ing.quantity,
                                                    unit: ing.unit
                                                  };
                                                }
                                              } else {
                                                console.error('Error adding ingredient:', error);
                                                return null;
                                              }
                                            } else if (newIngredient) {
                                              console.log(`✨ Added new ingredient: "${ing.name}"`);
                                              return {
                                                id: newIngredient.id.toString(),
                                                name: newIngredient.name,
                                                quantity: ing.quantity,
                                                unit: ing.unit
                                              };
                                            }
                                          } catch (error) {
                                            console.error('Error processing ingredient:', error);
                                          }
                                          return null;
                                        }));

                                        // Filter out any failed ingredients
                                        const validIngredients = formattedIngredients.filter(ing => ing !== null);
                                        form.setValue('ingredients', validIngredients);
                                        
                                        // Process instructions from AI
                                        const formattedInstructions = Array.isArray(recipeData.instructions) 
                                          ? recipeData.instructions.map((inst: { stepNumber: number; instruction: string }, index: number) => ({
                                              id: `ai-${index}`,
                                              stepNumber: inst.stepNumber || index + 1,
                                              instruction: typeof inst === 'object' ? inst.instruction : inst,
                                              imageUrl: ''
                                            }))
                                          : [];
                                        form.setValue('instructions', formattedInstructions);
                                        
                                        setCurrentStep(1);
                                      }
                                    } catch (error) {
                                      console.error('Error analyzing image:', error);
                                    } finally {
                                      setAnalyzing(false);
                                    }
                                  }}
                                  className="p-2 bg-orange-500/80 hover:bg-orange-500 text-white rounded-full backdrop-blur-sm transition-colors"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  disabled={analyzing}
                                >
                                  <Sparkles size={16} className={analyzing ? 'animate-pulse' : ''} />
                                </motion.button>
                                <motion.button
                                  type="button"
                                  onClick={() => {
                                    setImagePreview(null)
                                    setImageFile(null)
                                  }}
                                  className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm transition-colors"
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                >
                                  <X size={16} />
                                </motion.button>
                              </div>
                            </motion.div>
                          ) : (
                            <div className="flex flex-col sm:flex-row gap-3">
                              <motion.label
                                htmlFor="image-upload"
                                className="cursor-pointer flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-900/50 dark:hover:to-orange-800/50 text-orange-700 dark:text-orange-300 rounded-xl transition-colors flex-1 group"
                                whileHover={{ y: -2 }}
                                whileTap={{ y: 0 }}
                              >
                                <Camera size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="font-medium">Upload Image</span>
                                <input
                                  id="image-upload"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageChange}
                                  className="hidden"
                                />
                              </motion.label>
                              
                              <motion.label
                                htmlFor="camera-capture"
                                className="cursor-pointer flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-900/50 dark:hover:to-orange-800/50 text-orange-700 dark:text-orange-300 rounded-xl transition-colors flex-1 group"
                                whileHover={{ y: -2 }}
                                whileTap={{ y: 0 }}
                              >
                                <Smartphone size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="font-medium">Take Photo</span>
                                <input
                                  id="camera-capture"
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={handleImageChange}
                                  className="hidden"
                                />
                              </motion.label>

                              <motion.button
                                type="button"
                                className="cursor-pointer flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 hover:from-orange-100 hover:to-orange-200 dark:hover:from-orange-900/50 dark:hover:to-orange-800/50 text-orange-700 dark:text-orange-300 rounded-xl transition-colors flex-1 group"
                                whileHover={{ y: -2 }}
                                whileTap={{ y: 0 }}
                                onClick={() => setShowImageDialog(true)}
                              >
                                <Sparkles size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="font-medium">Prefill With AI</span>
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === 1 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FormField
                      control={form.control}
                      name="ingredients"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <RecipeIngredientsList
                              ingredients={field.value}
                              onChange={field.onChange}
                              availableIngredients={ingredients}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {currentStep === 2 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FormField
                      control={form.control}
                      name="instructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-300">Instructions</FormLabel>
                          <FormControl>
                            <RecipeStorySteps
                              instructions={field.value}
                              onChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="prep_time_minutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-300">Prep Time</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                              <FormControl>
                                <SelectTrigger className="border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-orange-500/20">
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {[0, 5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map((time) => (
                                  <SelectItem key={time} value={String(time)}>
                                    {time < 60 ? `${time} min` : `${time / 60} hour${time > 60 ? 's' : ''}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cook_time_minutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-300">Cook Time</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                              <FormControl>
                                <SelectTrigger className="border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-orange-500/20">
                                  <SelectValue placeholder="Select time" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {[5, 10, 15, 20, 25, 30, 45, 60, 90, 120].map((time) => (
                                  <SelectItem key={time} value={String(time)}>
                                    {time < 60 ? `${time} min` : `${time / 60} hour${time > 60 ? 's' : ''}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="servings"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-300">Servings</FormLabel>
                            <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={String(field.value)}>
                              <FormControl>
                                <SelectTrigger className="border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-orange-500/20">
                                  <SelectValue placeholder="Select servings" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {[1, 2, 3, 4, 6, 8, 10, 12].map((serving) => (
                                  <SelectItem key={serving} value={String(serving)}>
                                    {serving} {serving === 1 ? 'person' : 'people'}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="difficulty_level"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-gray-700 dark:text-gray-300">Difficulty</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="border-gray-200 dark:border-gray-800 focus:ring-2 focus:ring-orange-500/20">
                                  <SelectValue placeholder="Select difficulty" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.entries(difficultyEmoji).map(([level, emoji]) => (
                                  <SelectItem key={level} value={level}>
                                    {emoji} {level.charAt(0).toUpperCase() + level.slice(1)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between mt-6">
                {currentStep > 0 && (
                  <Button
                    type="button"
                    onClick={prevStep}
                    variant="outline"
                    className="bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                  >
                    Back
                  </Button>
                )}
                <div className="flex-1" />
                {currentStep < steps.length - 1 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md"
                  >
                    Next
                  </Button>
                ) : (
                  <Button 
                    type="submit"
                    disabled={loading}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-md"
                  >
                    {loading ? 'Creating...' : 'Create Recipe'}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/90 dark:to-orange-900/90 border-none shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-orange-700 dark:text-orange-300 flex items-center gap-2">
              <Camera className="w-6 h-6" />
              Oops! We Need a Photo
            </DialogTitle>
            <DialogDescription className="text-base text-gray-700 dark:text-gray-300 space-y-3 mt-2">
              <p>Hey there! 👋 Our AI is super excited to help fill out your recipe, but it needs a photo to work its magic! ✨</p>
              <p>Just snap a quick pic or upload one of your delicious creation&apos;s, and we&apos;ll handle the rest! 📸</p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mt-4">
            <Button 
              variant="ghost" 
              onClick={() => setShowImageDialog(false)}
              className="bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/50 dark:hover:bg-orange-800/50 text-orange-700 dark:text-orange-300"
            >
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}