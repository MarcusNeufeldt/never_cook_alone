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
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 shadow-lg z-50"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <div className="container mx-auto px-4 max-w-screen-sm">
        <ul className="flex justify-around py-2">
          {tabs.map((item) => (
            <motion.li 
              key={item.label} 
              className="relative"
              whileTap={{ scale: 0.9 }}
              initial={false}
              animate={activeTab === item.id ? "active" : "inactive"}
            >
              <button
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
                  activeTab === item.id 
                    ? 'text-primary' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                aria-label={item.label}
              >
                <div className="relative">
                  <item.icon size={22} />
                  {activeTab === item.id && (
                    <motion.div 
                      className="absolute inset-0 bg-primary/10 rounded-full"
                      layoutId="activeTab"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </div>
                <span className="text-xs font-medium">{item.label}</span>
              </button>
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.nav>
  )
}
