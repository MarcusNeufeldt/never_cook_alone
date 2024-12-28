import { Home, Book, PlusCircle, Sparkles, LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

export type TabId = 'home' | 'recipes' | 'add' | 'ai';

interface TabItem {
  icon: LucideIcon;
  label: string;
  id: TabId;
}

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs: TabItem[] = [
    { icon: Home, label: 'Home', id: 'home' },
    { icon: Book, label: 'Recipes', id: 'recipes' },
    { icon: PlusCircle, label: 'Add', id: 'add' },
    { icon: Sparkles, label: 'AI', id: 'ai' },
  ]

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <div className="container mx-auto px-4">
        <ul className="flex justify-around py-3">
          {tabs.map((item) => (
            <motion.li key={item.label} whileTap={{ scale: 0.9 }}>
              <button
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center ${
                  activeTab === item.id ? 'text-orange-500' : 'text-gray-600'
                }`}
              >
                <item.icon size={24} />
                <span className="text-xs mt-1">{item.label}</span>
              </button>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.nav>
  )
}
