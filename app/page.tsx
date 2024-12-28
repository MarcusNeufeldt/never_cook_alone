'use client'

import { useState, useEffect } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import FeaturedRecipe from '@/components/FeaturedRecipe'
import CategoryList from '@/components/CategoryList'
import RecentRecipes from '@/components/RecentRecipes'
import RecipeGallery from '@/components/RecipeGallery'
import AddRecipeForm from '@/components/AddRecipeForm'
import BottomNav, { TabId } from '@/components/BottomNav'
import Auth from '@/components/Auth'
import AIChatInterface from '@/components/AIChatInterface'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [session, setSession] = useState<Session | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleCategorySelect = (categoryId: number) => {
    console.log('Category selected:', categoryId); 
    setSelectedCategory(categoryId);
    setActiveTab('recipes');
  }

  useEffect(() => {
    console.log('Active tab:', activeTab); 
    console.log('Selected category:', selectedCategory); 
  }, [activeTab, selectedCategory]);

  if (!session) {
    return <Auth />
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-orange-50 to-orange-100">
      {activeTab === 'home' && (
        <>
          <Header title="Home" />
          <main className="flex-1 container mx-auto px-4 pb-24">
            <FeaturedRecipe />
            <CategoryList onCategorySelect={handleCategorySelect} />
            <RecentRecipes />
          </main>
        </>
      )}
      
      {activeTab === 'recipes' && (
        <main className="flex-1 container mx-auto px-4 pb-24">
          <RecipeGallery initialCategory={selectedCategory} />
        </main>
      )}
      
      {activeTab === 'add' && (
        <main className="flex-1 container mx-auto px-4 pb-24">
          <AddRecipeForm />
        </main>
      )}
      
      {activeTab === 'ai' && (
        <main className="flex-1 container mx-auto px-4 pb-24">
          <AIChatInterface />
        </main>
      )}
      
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  )
}
