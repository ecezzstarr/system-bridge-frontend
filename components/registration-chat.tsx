'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Message {
  id: string
  client_id: string
  client_name: string
  position: string
  sender_type: 'client' | 'admin'
  content: string
  is_read: boolean
  created_at: string
}

export function RegistrationChat({ department, onCodeReceived }: { department: string, onCodeReceived?: (code: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Generate or retrieve a temporary client ID for the visitor
    let id = localStorage.getItem('ssb_registration_chat_id')
    if (!id) {
      id = 'visitor_' + Math.random().toString(36).substring(2, 15)
      localStorage.setItem('ssb_registration_chat_id', id)
    }
    setClientId(id)

    // Initial load
    fetchMessages(id)

    // Poll for new messages
    const interval = setInterval(() => fetchMessages(id, true), 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchMessages = async (id: string, silent = false) => {
    try {
      const response = await fetch(`/api/client/messages?clientId=${id}&position=registration`)
      const data = await response.json()
      if (data.success) {
        setMessages(data.messages || [])
        
        // Check if any message from admin contains a code
        // Simple heuristic: if admin sends a message that looks like a code
        const lastAdminMsg = [...data.messages].reverse().find(m => m.sender_type === 'admin')
        if (lastAdminMsg && onCodeReceived) {
          const codeMatch = lastAdminMsg.content.match(/[A-Z]+-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/)
          if (codeMatch) {
            // We could automatically fill it, but the requirement says 
            // "The registration interface should not automatically generate the code for the user."
            // and "User enters code". So we just let them see it.
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || !clientId || isLoading) return

    const content = input.trim()
    setInput('')
    setIsLoading(true)

    try {
      await fetch('/api/client/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          clientName: `Visitor (${department})`,
          position: 'registration',
          content,
          senderType: 'client'
        })
      })
      fetchMessages(clientId)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[400px] bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-cyan-400" />
          <span className="text-sm font-bold text-white uppercase tracking-wider">Administration Chat</span>
        </div>
        <span className="text-[10px] text-slate-500 font-bold uppercase">Department: {department}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <p className="text-xs text-slate-400 leading-relaxed">
              Administration is standing by. <br />
              Introduce yourself and request your <br />
              <span className="text-cyan-400 font-bold">{department}</span> departmental code.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_type === 'client' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                  msg.sender_type === 'client'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={`text-[9px] mt-1 ${msg.sender_type === 'client' ? 'text-white/60' : 'text-slate-500'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-slate-700 bg-slate-900">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your request..."
            className="flex-1 bg-slate-800 border-slate-700 text-white text-xs h-9"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            size="sm"
            className="bg-cyan-600 hover:bg-cyan-700 h-9 px-3"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
