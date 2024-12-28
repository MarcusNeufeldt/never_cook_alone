"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from '@/lib/supabase'

interface Ingredient {
  id: string
  name: string
  quantity: number
  unit: string
}

interface RecipeIngredientsListProps {
  ingredients: Ingredient[]
  onChange: (ingredients: Ingredient[]) => void
  availableIngredients: { label: string; value: string }[]
}

const commonUnits = [
  "g",
  "kg",
  "ml",
  "l",
  "cup",
  "tbsp",
  "tsp",
  "oz",
  "lb",
  "piece",
  "pinch",
]

export function RecipeIngredientsList({
  ingredients,
  onChange,
  availableIngredients,
}: RecipeIngredientsListProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedIngredient, setSelectedIngredient] = React.useState("")
  const [quantity, setQuantity] = React.useState("")
  const [unit, setUnit] = React.useState("g")
  const [customIngredient, setCustomIngredient] = React.useState("")

  const handleAddIngredient = () => {
    if (selectedIngredient && quantity) {
      const ingredient = availableIngredients.find(i => i.value === selectedIngredient)
      if (ingredient) {
        const newIngredient: Ingredient = {
          id: selectedIngredient,
          name: ingredient.label,
          quantity: parseFloat(quantity),
          unit,
        }
        onChange([...ingredients, newIngredient])
        setSelectedIngredient("")
        setQuantity("")
        setUnit("g")
        setOpen(false)
      }
    }
  }

  const handleRemoveIngredient = (id: string) => {
    onChange(ingredients.filter(i => i.id !== id))
  }

  const handleAddCustomIngredient = async () => {
    if (customIngredient.trim()) {
      try {
        // First, add to database
        const { data: newIngredient, error } = await supabase
          .from('ingredients')
          .insert([{ name: customIngredient.trim() }])
          .select()
          .single()

        if (error) {
          if (error.code === '23505') { // Unique constraint violation
            // Ingredient already exists in database, find it
            const { data: existingIngredient } = await supabase
              .from('ingredients')
              .select('*')
              .ilike('name', customIngredient.trim())
              .single()
            
            if (existingIngredient) {
              setSelectedIngredient(existingIngredient.id.toString())
            }
          } else {
            console.error('Error adding ingredient:', error)
            return
          }
        } else if (newIngredient) {
          // Use the newly created ingredient
          setSelectedIngredient(newIngredient.id.toString())
        }

        setCustomIngredient("")
      } catch (error) {
        console.error('Error adding ingredient:', error)
      }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Ingredients</Label>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Add Ingredient</DrawerTitle>
              <DrawerDescription>
                Select an ingredient and specify the quantity
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Ingredient</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={selectedIngredient} onValueChange={setSelectedIngredient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an ingredient" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableIngredients.map((ingredient) => (
                          <SelectItem key={ingredient.value} value={ingredient.value}>
                            {ingredient.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedIngredient && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedIngredient("")}
                    >
                      ×
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder={selectedIngredient ? "Select from dropdown" : "Add custom ingredient"}
                    value={customIngredient}
                    onChange={(e) => setCustomIngredient(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCustomIngredient()
                      }
                    }}
                    disabled={!!selectedIngredient}
                    className={selectedIngredient ? "opacity-50" : ""}
                  />
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={handleAddCustomIngredient}
                    disabled={!!selectedIngredient}
                  >
                    Add
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="Enter quantity"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {commonUnits.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={handleAddIngredient}>Add Ingredient</Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      <div className="space-y-2">
        {ingredients.map((ingredient) => (
          <div
            key={ingredient.id}
            className="flex items-center justify-between p-2 border rounded-lg"
          >
            <span>
              {ingredient.name} - {ingredient.quantity} {ingredient.unit}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveIngredient(ingredient.id)}
            >
              Remove
            </Button>
          </div>
        ))}
        {ingredients.length === 0 && (
          <div className="text-center text-muted-foreground p-4">
            No ingredients added yet
          </div>
        )}
      </div>
    </div>
  )
}
