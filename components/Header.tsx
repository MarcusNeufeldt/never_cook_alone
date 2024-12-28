'use client'

import { ChevronDown } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={user?.user_metadata?.avatar_url || "/placeholder.svg?height=32&width=32"} alt={user?.user_metadata?.full_name || "User"} />
              <AvatarFallback>{user?.user_metadata?.full_name?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="hidden sm:block">
              <p className="font-semibold">{user?.user_metadata?.full_name || "User"}</p>
              <p className="text-sm text-gray-600">View Profile</p>
            </div>
            <ChevronDown size={16} className="text-gray-400" />
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <h1 className="text-lg font-semibold text-gray-900">
          {title}
        </h1>

        {/* Empty div to maintain centering */}
        <div className="w-[40px]" />
      </div>
    </header>
  )
}
