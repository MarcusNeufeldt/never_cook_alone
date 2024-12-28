'use client'

import { useState, useRef, useEffect, ComponentPropsWithoutRef } from 'react'
import { startCookingAssistantChat } from '@/utils/gemini'
import type { ChatMessage } from '@/types/gemini'
import { Send, Trash2, Loader2 } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ReactMarkdown from 'react-markdown'

type ChatInstance = Awaited<ReturnType<typeof startCookingAssistantChat>>

interface CodeProps extends ComponentPropsWithoutRef<'code'> {
  inline?: boolean;
  className?: string;
}

const MarkdownMessage = ({ content }: { content: string }) => (
  <ReactMarkdown
    className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0"
    components={{
      // Customize link rendering
      a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          {children}
        </a>
      ),
      // Style code blocks
      code: ({ inline, className, children, ...props }: CodeProps) => (
        <code
          className={`${className} ${
            inline ? 'bg-muted px-1 py-0.5 rounded text-sm' : 'block bg-muted p-2 rounded-md'
          }`}
          {...props}
        >
          {children}
        </code>
      ),
      // Style lists
      ul: ({ children }) => (
        <ul className="list-disc list-inside my-2 space-y-1">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="list-decimal list-inside my-2 space-y-1">
          {children}
        </ol>
      ),
    }}
  >
    {content}
  </ReactMarkdown>
)

export default function AIChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [chat, setChat] = useState<ChatInstance | null>(null)

  const initializeChat = async () => {
    try {
      setIsLoading(true)
      const newChat = await startCookingAssistantChat()
      setChat(newChat)
      setMessages([])
    } catch (error) {
      console.error('Error initializing chat:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    initializeChat()
  }, [])

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleClearHistory = async () => {
    setIsLoading(true)
    setMessages([])
    await initializeChat()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputMessage.trim() || !chat || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const result = await chat.sendMessage([{ text: inputMessage }])
      console.log('AI Response:', result) // Debug log

      if (result?.response) {
        const text = await result.response.text()
        setMessages(prev => [...prev, {
          role: 'model',
          content: text,
          timestamp: new Date()
        }])
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, {
        role: 'model',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-[calc(100vh-4rem)]">
      <div className="h-[calc(100vh-8.5rem)] overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center p-4 rounded-lg bg-muted">
              <h3 className="font-medium mb-2">Welcome to your AI Cooking Assistant! 👩‍🍳</h3>
              <p className="text-sm text-muted-foreground">
                Ask me anything about recipes, cooking techniques, ingredient substitutions, or meal planning.
              </p>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="text-sm sm:text-base whitespace-pre-wrap break-words">{message.content}</p>
                ) : (
                  <MarkdownMessage content={message.content} />
                )}
                <p className="text-[10px] sm:text-xs mt-1 opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted text-muted-foreground rounded-lg p-3">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      <div className="fixed bottom-[4rem] left-0 right-0 border-t bg-background p-4">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
          <div className="flex space-x-2">
            <Input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask about recipes, tips..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button type="submit" size="icon" disabled={isLoading || !inputMessage.trim()}>
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
            <Button
              type="button"
              onClick={handleClearHistory}
              disabled={isLoading}
              size="icon"
              variant="outline"
            >
              <Trash2 className="h-4 w-4" />
              <span className="sr-only">Clear chat history</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
