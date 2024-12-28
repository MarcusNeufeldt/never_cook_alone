'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { formatDistanceToNow } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface User {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string | null;
  }

interface Comment {
    id: string;
    content: string;
    created_at: string;
    updated_at: string;
    user: User;
}

interface RecipeCommentsProps {
  recipeId: string
  currentUserId?: string
}

export default function RecipeComments({ recipeId, currentUserId }: RecipeCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchComments = useCallback(async () => {
      try {
          setLoading(true);
          // First, get the comments
          const { data: commentsData, error: commentsError } = await supabase
            .from('recipe_comments')
            .select('*')
            .eq('recipe_id', recipeId)
            .order('created_at', { ascending: false });
    
          if (commentsError) {
            console.error('Error fetching comments:', commentsError);
            throw commentsError
          }
          console.log('Comments data:', commentsData);
    
          // Get unique user IDs from comments
          const userIds = Array.from(new Set(commentsData.map((comment) => comment.user_id)));
          console.log('User IDs to fetch:', userIds);
    
          // Fetch user profiles for all comments
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', userIds);
    
          if (profilesError) {
            console.error('Error fetching user profiles:', profilesError);
              throw profilesError
          }
    
          // Map profiles to comments
          const commentsWithProfiles = commentsData.map((comment) => {
            const userProfile = profilesData.find((profile) => profile.id === comment.user_id);
            
            const user: User = userProfile ? {
                id: userProfile.id,
                username: userProfile.username,
                display_name: userProfile.display_name,
                avatar_url: userProfile.avatar_url,
              } : {
                id: comment.user_id,
                username: 'unknown',
                display_name: 'Unknown User',
                avatar_url: null
              };
    
            return {
              ...comment,
              user
            };
          });
    
          setComments(commentsWithProfiles);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching comments:', error);
          toast({
            title: "Error",
            description: "Failed to load comments",
            variant: "destructive",
          });
          setLoading(false);
        }
      }, [recipeId, toast]);

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  async function handleAddComment() {
    if (!newComment.trim() || !currentUserId) return;

    try {
      console.log('Adding comment with user ID:', currentUserId); // Debug log
      const { error } = await supabase
        .from('recipe_comments')
        .insert([{
          recipe_id: recipeId,
          content: newComment.trim(),
          user_id: currentUserId
        }])

      if (error) throw error

      setNewComment('')
      await fetchComments() // Wait for comments to be fetched
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully",
      })
    } catch (error) {
      console.error('Error adding comment:', error)
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      })
    }
  }

  async function handleEditComment(commentId: string) {
    if (!editContent.trim()) return

    try {
      const { error } = await supabase
        .from('recipe_comments')
        .update({ content: editContent.trim() })
        .eq('id', commentId)

      if (error) throw error

      setEditingComment(null)
      fetchComments()
      toast({
        title: "Comment updated",
        description: "Your comment has been updated successfully",
      })
    } catch (error) {
      console.error('Error updating comment:', error)
      toast({
        title: "Error",
        description: "Failed to update comment",
        variant: "destructive",
      })
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      const { error } = await supabase
        .from('recipe_comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      setComments(comments.filter(comment => comment.id !== commentId))
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting comment:', error)
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-semibold text-gray-900">Comments</h2>
      
      {currentUserId && (
        <Card className="overflow-hidden">
          <CardContent className="p-6">
            <Textarea
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="mb-4"
            />
            <Button 
              onClick={handleAddComment}
              disabled={!newComment.trim()}
            >
              Add Comment
            </Button>
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {comments.map((comment) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar>
                      <AvatarImage src={comment.user.avatar_url || "/placeholder.svg"} alt={comment.user.display_name} />
                      <AvatarFallback>{comment.user.display_name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">
                        {comment.user.display_name || comment.user.username || 'Unknown User'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        {comment.updated_at !== comment.created_at && " (edited)"}
                      </p>
                    </div>
                  </div>
                  
                  {currentUserId === comment.user.id && (
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingComment(comment.id)
                          setEditContent(comment.content)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                {editingComment === comment.id ? (
                  <div className="mt-4">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="mb-4"
                    />
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setEditingComment(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleEditComment(comment.id)}
                        disabled={!editContent.trim()}
                      >
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-gray-700">{comment.content}</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {!loading && comments.length === 0 && (
        <p className="text-center text-gray-500">No comments yet. Be the first to comment!</p>
      )}
    </div>
  )
}