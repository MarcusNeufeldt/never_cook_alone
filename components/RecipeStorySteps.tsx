'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Camera, Plus, Trash2, Image as ImageIcon, Mic } from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from "@/lib/utils"
import { uploadStepImage, deleteStepImage } from '@/lib/step-image-upload'

interface Instruction {
  id: string
  stepNumber: number
  instruction: string
  imageUrl?: string
}

interface RecipeStoryStepsProps {
  instructions: Instruction[]
  onChange: (instructions: Instruction[]) => void
  recipeId?: string
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionError extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionError) => void;
  onend: () => void;
  start: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export function RecipeStorySteps({
  instructions,
  onChange,
  recipeId = 'temp'
}: RecipeStoryStepsProps) {
  const [activeStep, setActiveStep] = useState<number>(0)
  const [isRecording, setIsRecording] = useState(false)

  const addInstruction = () => {
    const newInstruction: Instruction = {
      id: Math.random().toString(36).substr(2, 9),
      stepNumber: instructions.length + 1,
      instruction: ''
    }
    onChange([...instructions, newInstruction])
    setActiveStep(instructions.length)
  }

  const updateInstruction = (id: string, updates: Partial<Instruction>) => {
    onChange(
      instructions.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    )
  }

  const removeInstruction = (id: string) => {
    const updatedInstructions = instructions
      .filter((item) => item.id !== id)
      .map((item, index) => ({
        ...item,
        stepNumber: index + 1
      }))
    onChange(updatedInstructions)
    if (activeStep >= updatedInstructions.length) {
      setActiveStep(Math.max(0, updatedInstructions.length - 1))
    }
  }

  const handleImageUpload = async (id: string, file: File) => {
    try {
      const step = instructions.find(i => i.id === id)
      if (!step) return

      // If there's an existing image, delete it first
      if (step.imageUrl) {
        await deleteStepImage(step.imageUrl)
      }

      const imageUrl = await uploadStepImage(file, recipeId, step.stepNumber)
      updateInstruction(id, { imageUrl })
    } catch (error) {
      console.error('Error uploading image:', error)
    }
  }

  const startVoiceInput = async () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser')
      return
    }

    setIsRecording(true)
    const recognition = new window.webkitSpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join('')

      updateInstruction(instructions[activeStep].id, {
        instruction: transcript
      })
    }

    recognition.onerror = (event: SpeechRecognitionError) => {
      console.error('Speech recognition error', event.error)
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognition.start()
  }

  return (
    <div className="space-y-6">
      {/* Timeline Steps */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 px-2 -mx-2">
        {instructions.map((step, index) => (
          <motion.button
            key={step.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => setActiveStep(index)}
            className={cn(
              "flex-shrink-0 w-16 h-16 rounded-full border-2 relative overflow-hidden transition-all",
              activeStep === index 
                ? "border-orange-500 ring-2 ring-orange-200" 
                : index < activeStep 
                  ? "border-green-500 opacity-70" 
                  : "border-gray-200"
            )}
          >
            {step.imageUrl ? (
              <Image
                src={step.imageUrl}
                alt={`Step ${step.stepNumber}`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-orange-50">
                <span className="text-orange-600 font-semibold">
                  {step.stepNumber}
                </span>
              </div>
            )}
          </motion.button>
        ))}
        <Button
          variant="outline"
          size="icon"
          onClick={addInstruction}
          className="flex-shrink-0 w-16 h-16 rounded-full"
        >
          <Plus size={24} />
        </Button>
      </div>

      {/* Active Step Editor */}
      <AnimatePresence mode="wait">
        {instructions[activeStep] && (
          <motion.div
            key={instructions[activeStep].id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 bg-white rounded-xl p-6 border border-gray-200 shadow-sm"
          >
            {/* Step Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-orange-600">
                Step {instructions[activeStep].stepNumber}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeInstruction(instructions[activeStep].id)}
                className="text-red-500"
              >
                <Trash2 size={20} />
              </Button>
            </div>

            {/* Step Content */}
            <div className="space-y-4">
              <div className="relative">
                <Textarea
                  value={instructions[activeStep].instruction}
                  onChange={(e) =>
                    updateInstruction(instructions[activeStep].id, {
                      instruction: e.target.value
                    })
                  }
                  placeholder="Describe this step..."
                  className="min-h-[100px] pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={startVoiceInput}
                  className={cn(
                    "absolute right-2 top-2 text-gray-400 hover:text-orange-500",
                    isRecording && "text-red-500 animate-pulse"
                  )}
                >
                  <Mic size={20} />
                </Button>
              </div>

              {instructions[activeStep].imageUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden">
                  <Image
                    src={instructions[activeStep].imageUrl}
                    alt={`Step ${instructions[activeStep].stepNumber}`}
                    fill
                    className="object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={async () => {
                      try {
                        await deleteStepImage(instructions[activeStep].imageUrl!)
                        updateInstruction(instructions[activeStep].id, {
                          imageUrl: undefined
                        })
                      } catch (error) {
                        console.error('Error deleting image:', error)
                      }
                    }}
                    className="absolute top-2 right-2"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors">
                    <ImageIcon size={20} />
                    <span>Gallery</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleImageUpload(instructions[activeStep].id, file)
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg transition-colors">
                    <Camera size={20} />
                    <span>Camera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          handleImageUpload(instructions[activeStep].id, file)
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
