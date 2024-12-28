import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface CategoryListProps {
  onCategorySelect?: (categoryId: number) => void;
  maxCategories?: number;
}

export default function CategoryList({ 
  onCategorySelect, 
  maxCategories = 3
}: CategoryListProps) {
  const router = useRouter()
  const [categories, setCategories] = useState<Array<{
    id: number;
    name: string;
    icon: string;
    color: string;
  }>>([]);

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .order('name')
      .limit(maxCategories);
    
    if (error) {
      console.error('Error fetching categories:', error);
      return;
    }

    // Map database categories to UI categories with icons
    const categoriesWithIcons = data.map(cat => {
      const icon = cat.name === 'Breakfast' ? '🍳' :
                  cat.name === 'Lunch' ? '🥪' :
                  cat.name === 'Dinner' ? '🍽️' : '🍴';
      const color = cat.name === 'Breakfast' ? 'bg-yellow-100' :
                   cat.name === 'Lunch' ? 'bg-green-100' :
                   cat.name === 'Dinner' ? 'bg-blue-100' : 'bg-gray-100';
      return {
        ...cat,
        icon,
        color
      };
    });

    setCategories(categoriesWithIcons);
  }, [maxCategories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCategoryClick = (categoryId: number) => {
    if (onCategorySelect) {
      onCategorySelect(categoryId);
    } else {
      router.push(`/recipes?category=${categoryId}`)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Top 3 Categories</h2>
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {categories.map((category, index) => (
          <motion.button
            key={category.name}
            onClick={() => handleCategoryClick(category.id)}
            className={`${category.color} rounded-xl p-3 sm:p-4 shadow-md hover:shadow-lg transition-shadow flex flex-col items-center justify-center space-y-1 sm:space-y-2`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <span className="text-2xl sm:text-4xl">{category.icon}</span>
            <span className="font-medium text-gray-800 text-sm sm:text-base">{category.name}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
