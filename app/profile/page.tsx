'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { supabase } from '@/lib/supabase'
import { updateProfile } from './update-profile'
import { useRouter } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError

        if (!sessionData.session?.user) {
          router.push('/login')
          return
        }

        const userId = sessionData.session.user.id
        setUserId(userId)
        
        // Get the avatar URL from user metadata
        const avatarUrl = sessionData.session.user.user_metadata?.avatar_url
        if (avatarUrl) {
          setAvatarUrl(avatarUrl)
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('id', userId)
          .single()

        if (profileError) throw profileError

        setUsername(profileData.username || '')
        setDisplayName(profileData.display_name || '')
        // Only update avatar URL from profile if it's not already set from metadata
        if (!avatarUrl && profileData.avatar_url) {
          setAvatarUrl(profileData.avatar_url)
        }
      } catch (error) {
        console.error('Error loading profile:', error)
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return

    try {
      setLoading(true)
      const { error } = await updateProfile(userId, {
        username,
        display_name: displayName,
        avatar_url: avatarUrl
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>
  }

  return (
    <div className="container max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Update Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center mb-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={displayName} />
              <AvatarFallback>{displayName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                Username
              </label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="displayName" className="text-sm font-medium">
                Display Name
              </label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
