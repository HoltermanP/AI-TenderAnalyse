'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import ReactMarkdown from 'react-markdown'
import { cn, generateSessionId } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface ChatInterfaceProps {
  tenderId?: string
  initialContext?: string
  placeholder?: string
}

export function ChatInterface({
  tenderId,
  initialContext,
  placeholder = 'Stel een vraag over tenders...',
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId] = useState(() => generateSessionId())
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: trimmed,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    const assistantId = `assistant_${Date.now()}`
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', streaming: true },
    ])

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          tenderId,
          context: initialContext,
          messages: [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user', content: trimmed },
          ],
        }),
      })

      if (!response.ok) throw new Error('Chat request failed')

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No response body')

      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data) as { text?: string }
              if (parsed.text) {
                accumulated += parsed.text
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: accumulated }
                      : m
                  )
                )
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m
        )
      )
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  'Er is een fout opgetreden. Probeer het opnieuw.',
                streaming: false,
              }
            : m
        )
      )
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }, [input, isLoading, messages, sessionId, tenderId, initialContext])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0"
        role="log"
        aria-live="polite"
        aria-label="Chatgeschiedenis"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Bot className="w-12 h-12 text-ai-blue mb-3 opacity-60" />
            <p className="text-slate-ai text-sm">
              Stel een vraag over een tender of vraag om analyse-hulp
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 px-4',
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            )}
          >
            <div
              className={cn(
                'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                message.role === 'user'
                  ? 'bg-ai-blue'
                  : 'bg-surface border border-border-subtle'
              )}
              aria-hidden="true"
            >
              {message.role === 'user' ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-blue-light" />
              )}
            </div>

            <div
              className={cn(
                'max-w-[80%] rounded-xl px-4 py-3 text-sm',
                message.role === 'user'
                  ? 'bg-ai-blue text-white rounded-tr-sm'
                  : 'bg-surface border border-border-subtle text-off-white rounded-tl-sm'
              )}
            >
              {message.role === 'assistant' ? (
                <div
                  className={cn(
                    'prose prose-invert prose-sm max-w-none',
                    message.streaming && message.content === '' && 'cursor-blink'
                  )}
                >
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border-subtle p-4">
        <div className="flex items-end gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="text-slate-ai hover:text-velocity-red transition-colors p-2 rounded-md"
              aria-label="Chat wissen"
              title="Chat wissen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none bg-surface border border-border-subtle rounded-lg px-4 py-3 text-sm text-off-white placeholder-slate-ai focus:outline-none focus:border-ai-blue transition-colors min-h-[44px] max-h-32"
            style={{ height: Math.min(32 + input.split('\n').length * 20, 128) }}
            aria-label="Chat bericht"
            disabled={isLoading}
          />
          <Button
            onClick={() => void sendMessage()}
            disabled={!input.trim() || isLoading}
            loading={isLoading}
            size="md"
            aria-label="Verstuur bericht"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-ai mt-2 text-center">
          Enter om te versturen · Shift+Enter voor nieuwe regel
        </p>
      </div>
    </div>
  )
}
