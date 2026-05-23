'use client'

import { Button } from '@/components/ui/button'
import { MessageCircle, Send, Users, Loader2, Video, Image, X, Search, Bell, Shield, UserCheck, User } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-provider'

interface Message {
  id: string
  sender: string
  senderAvatar: string
  senderRole?: string
  content: string
  messageType?: 'text' | 'video' | 'image' | 'link'
  mediaUrl?: string
  timestamp: string
}

interface LoungeUser {
  id: string
  name: string
  username: string
  avatar?: string
  role?: string
  status?: 'online' | 'offline'
}

const getRoleBadge = (role?: string) => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return { icon: Shield, color: 'text-red-400 bg-red-500/20', label: 'Admin' }
    case 'agent':
      return { icon: UserCheck, color: 'text-cyan-400 bg-cyan-500/20', label: 'Agent' }
    case 'bridger':
      return { icon: User, color: 'text-emerald-400 bg-emerald-500/20', label: 'Bridger' }
    default:
      return { icon: User, color: 'text-slate-400 bg-slate-500/20', label: 'User' }
  }
}

export default function Lounge() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'public' | 'private'>('public')
  const [selectedUser, setSelectedUser] = useState<LoungeUser | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [privateMessages, setPrivateMessages] = useState<Message[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [allUsers, setAllUsers] = useState<LoungeUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showMediaInput, setShowMediaInput] = useState(false)
  const [mediaUrl, setMediaUrl] = useState('')
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video')
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, privateMessages])

  // Fetch all users for private messaging
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.users) {
            setAllUsers(data.users.filter((u: LoungeUser) => u.id !== user?.id))
          }
        }
      } catch (error) {
        console.error('Failed to fetch users:', error)
      }
    }
    if (user) fetchUsers()
  }, [user])

  // Fetch notifications count
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return
      try {
        const response = await fetch(`/api/notifications?userId=${user.id}&unreadOnly=true`)
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setUnreadCount(data.notifications?.length || 0)
          }
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [user])

  // Fetch public messages
  useEffect(() => {
    if (activeTab !== 'public') return

    const fetchMessages = async () => {
      try {
        const response = await fetch('/api/lounge/messages?roomType=public&roomId=main')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.messages) {
            setMessages(data.messages)
          }
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessages()
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [activeTab])

  // Fetch private messages when a user is selected
  useEffect(() => {
    if (!selectedUser || !user) return

    const fetchPrivateMessages = async () => {
      const roomId = [user.id, selectedUser.id].sort().join('-')
      try {
        const response = await fetch(`/api/lounge/messages?roomType=private&roomId=${roomId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.messages) {
            setPrivateMessages(data.messages)
          }
        }
      } catch (error) {
        console.error('Failed to fetch private messages:', error)
      } finally {
        setIsLoading(false)
      }
    }

    setIsLoading(true)
    fetchPrivateMessages()
    const interval = setInterval(fetchPrivateMessages, 2000)
    return () => clearInterval(interval)
  }, [selectedUser, user])

  const handleSendMessage = async (isPrivate: boolean = false) => {
    if ((!messageInput.trim() && !mediaUrl) || !user) return

    setIsSending(true)
    try {
      const roomId = isPrivate && selectedUser 
        ? [user.id, selectedUser.id].sort().join('-')
        : 'main'

      const response = await fetch('/api/lounge/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: user.name,
          senderAvatar: '👤',
          senderRole: user.role,
          content: messageInput,
          userId: user.id,
          roomType: isPrivate ? 'private' : 'public',
          roomId,
          messageType: mediaUrl ? mediaType : 'text',
          mediaUrl: mediaUrl || null,
        }),
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        if (isPrivate) {
          setPrivateMessages(prev => [...prev, data])
          
          // Send notification to the recipient
          if (selectedUser) {
            await fetch('/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                userId: selectedUser.id,
                type: 'message',
                title: `New message from ${user.name}`,
                content: messageInput.substring(0, 100) || (mediaUrl ? 'Shared media' : ''),
                fromUserId: user.id,
                fromUserName: user.name,
                link: '/lounge?tab=private',
              }),
            })
          }
        } else {
          setMessages(prev => [...prev, data])
        }
        setMessageInput('')
        setMediaUrl('')
        setShowMediaInput(false)
      }
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  // Check if URL is a YouTube video
  const isYouTubeUrl = (url: string) => {
    return url.includes('youtube.com') || url.includes('youtu.be')
  }

  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/)
    return match ? match[1] : null
  }

  const filteredUsers = allUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderMessage = (msg: Message) => {
    const badge = getRoleBadge(msg.senderRole)
    const BadgeIcon = badge.icon
    
    return (
      <div key={msg.id} className="flex gap-2 group">
        <span className="text-lg flex-shrink-0">{msg.senderAvatar || '👤'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <p className="font-semibold text-white text-xs">{msg.sender}</p>
            {msg.senderRole && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.color}`}>
                <BadgeIcon className="h-2.5 w-2.5" />
                {badge.label}
              </span>
            )}
            <span className="text-[10px] text-slate-500">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          {msg.content && <p className="text-slate-300 break-words text-xs">{msg.content}</p>}
          
          {/* Video rendering - YouTube embed or direct video */}
          {msg.mediaUrl && msg.messageType === 'video' && (
            <div className="mt-2 rounded-lg overflow-hidden max-w-md">
              {isYouTubeUrl(msg.mediaUrl) ? (
                <iframe
                  src={`https://www.youtube.com/embed/${getYouTubeId(msg.mediaUrl)}`}
                  className="w-full aspect-video rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video 
                  src={msg.mediaUrl} 
                  controls 
                  className="w-full rounded-lg"
                  preload="metadata"
                />
              )}
            </div>
          )}
          
          {/* Image rendering */}
          {msg.mediaUrl && msg.messageType === 'image' && (
            <div className="mt-2 rounded-lg overflow-hidden max-w-md">
              <img 
                src={msg.mediaUrl} 
                alt="Shared image" 
                className="w-full rounded-lg cursor-pointer hover:opacity-90 transition"
                onClick={() => window.open(msg.mediaUrl, '_blank')}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderMessageInput = (isPrivate: boolean = false) => (
    <div className="border-t border-slate-700 p-2 space-y-2">
      {showMediaInput && (
        <div className="space-y-2 bg-slate-800 rounded-lg p-3">
          <div className="flex gap-2 items-center">
            <select 
              value={mediaType}
              onChange={(e) => setMediaType(e.target.value as 'video' | 'image')}
              className="bg-slate-700 text-white text-xs rounded px-2 py-1.5 border-0"
            >
              <option value="video">Video</option>
              <option value="image">Image</option>
            </select>
            <button onClick={() => { setShowMediaInput(false); setMediaUrl(''); }} className="ml-auto text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder={mediaType === 'video' ? "Paste YouTube URL or video link..." : "Paste image URL..."}
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            className="w-full bg-slate-700 border-0 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          {mediaUrl && mediaType === 'video' && isYouTubeUrl(mediaUrl) && (
            <p className="text-[10px] text-green-400">YouTube video detected</p>
          )}
          {mediaUrl && mediaType === 'image' && (
            <div className="mt-2">
              <img src={mediaUrl} alt="Preview" className="max-h-32 rounded" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button 
          onClick={() => { setShowMediaInput(!showMediaInput); setMediaType('video'); }}
          className={`p-1.5 rounded transition ${showMediaInput && mediaType === 'video' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          title="Share video"
        >
          <Video className="h-4 w-4" />
        </button>
        <button 
          onClick={() => { setShowMediaInput(!showMediaInput); setMediaType('image'); }}
          className={`p-1.5 rounded transition ${showMediaInput && mediaType === 'image' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
          title="Share image"
        >
          <Image className="h-4 w-4" />
        </button>
        <input
          type="text"
          placeholder={isPrivate ? `Message ${selectedUser?.name}...` : "Say something to everyone..."}
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(isPrivate)}
          className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
        <Button 
          onClick={() => handleSendMessage(isPrivate)}
          disabled={isSending || (!messageInput.trim() && !mediaUrl)}
          className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 text-white border-0 h-8 w-8 p-0 flex-shrink-0"
        >
          {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="px-4 py-4 space-y-4 h-[calc(100vh-180px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold text-white mb-1">Lounge</h1>
          <p className="text-xs text-slate-400">Admins, Agents & Bridgers chat together</p>
        </div>
        {unreadCount > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 rounded-full text-xs">
            <Bell className="h-3 w-3" />
            {unreadCount} new
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-700">
        <button
          onClick={() => { setActiveTab('public'); setSelectedUser(null); }}
          className={`px-2 py-2 font-semibold text-sm transition-all ${
            activeTab === 'public' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <MessageCircle className="h-4 w-4 inline mr-1" />
          Public Lounge
        </button>
        <button
          onClick={() => setActiveTab('private')}
          className={`px-2 py-2 font-semibold text-sm transition-all relative ${
            activeTab === 'private' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          <Users className="h-4 w-4 inline mr-1" />
          Private Messages
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Public Chat */}
      {activeTab === 'public' && (
        <div className="flex-1 flex flex-col gap-2 min-h-0">
          <div className="flex-1 flex flex-col bg-slate-900/40 rounded-lg border border-slate-700 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                  <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
                  <p>No messages yet. Be the first to say something!</p>
                </div>
              ) : (
                <>
                  {messages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>
            {renderMessageInput(false)}
          </div>
        </div>
      )}

      {/* Private Messages */}
      {activeTab === 'private' && (
        <div className="flex-1 flex flex-col min-h-0 gap-2">
          {!selectedUser ? (
            <div className="flex-1 bg-slate-900/40 rounded-lg border border-slate-700 p-3 overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search admins, agents, bridgers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex-1 overflow-y-auto space-y-1">
                {filteredUsers.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">No users found</p>
                ) : (
                  filteredUsers.map((u) => {
                    const badge = getRoleBadge(u.role)
                    const BadgeIcon = badge.icon
                    return (
                      <button
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className="w-full text-left p-3 rounded-lg transition-all hover:bg-cyan-500/20 border border-transparent hover:border-cyan-500/50 flex items-center gap-3"
                      >
                        <span className="text-2xl">{u.avatar || '👤'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white truncate">{u.name}</p>
                            <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${badge.color}`}>
                              <BadgeIcon className="h-2.5 w-2.5" />
                              {badge.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">@{u.username}</p>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="bg-slate-900/40 rounded-lg border border-slate-700 p-3 flex items-center gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 text-sm"
                >
                  Back
                </button>
                <span className="text-2xl">{selectedUser.avatar || '👤'}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white text-sm">{selectedUser.name}</p>
                    {selectedUser.role && (
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ${getRoleBadge(selectedUser.role).color}`}>
                        {getRoleBadge(selectedUser.role).label}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">@{selectedUser.username}</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 flex flex-col bg-slate-900/40 rounded-lg border border-slate-700 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 text-cyan-400 animate-spin" />
                    </div>
                  ) : privateMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 text-sm">
                      <Users className="h-10 w-10 mb-2 opacity-50" />
                      <p>Start a conversation with {selectedUser.name}</p>
                    </div>
                  ) : (
                    <>
                      {privateMessages.map(renderMessage)}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
                {renderMessageInput(true)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
