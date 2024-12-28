'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Recipe {
  id: number
  name: string
  image: string
  description: string
  steps: string[]
  ingredients: string[]
}

interface InteractiveRecipeViewProps {
  recipe: Recipe
}

export default function InteractiveRecipeView({ recipe }: InteractiveRecipeViewProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const nextStep = () => {
    setCurrentStep((prev) => (prev + 1) % recipe.steps.length)
  }

  const prevStep = () => {
    setCurrentStep((prev) => (prev - 1 + recipe.steps.length) % recipe.steps.length)
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group">
          <Image 
            src={recipe.image} 
            alt={recipe.name} 
            layout="fill" 
            objectFit="cover" 
            className="transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black bg-opacity-30 flex items-end p-2">
            <h3 className="text-white text-sm font-semibold">{recipe.name}</h3>
          </div>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{recipe.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative aspect-video rounded-lg overflow-hidden">
            <Image 
              src={recipe.image} 
              alt={recipe.name} 
              layout="fill" 
              objectFit="cover"
            />
          </div>
          <p className="text-sm text-gray-500">{recipe.description}</p>
          <div className="relative">
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-2">Step {currentStep + 1}</h4>
                <p>{recipe.steps[currentStep]}</p>
              </CardContent>
            </Card>
            <div className="absolute inset-y-0 left-0 flex items-center">
              <Button variant="ghost" size="icon" onClick={prevStep}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center">
              <Button variant="ghost" size="icon" onClick={nextStep}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Ingredients</h4>
            <ul className="list-disc list-inside space-y-1">
              {recipe.ingredients.map((ingredient, index) => (
                <li key={index} className="text-sm">{ingredient}</li>
              ))}
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

