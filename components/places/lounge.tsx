'use client'

import { Button } from '@/components/ui/button'
import { 
  MessageCircle, 
  Send, 
  Users, 
  Loader2, 
  Video, 
  Image, 
  X, 
  Search, 
  Bell, 
  Shield, 
  UserCheck, 
  User,
  MessageSquare,
  ChevronLeft,
  MoreVertical,
  Trash2,
  Plus
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { toast } from 'sonner'
import StatusFeed from './status-feed'

interface Message {
  id: string
  sender: string
  senderAvatar: string
  senderRole?: string
  content: string
  messageType?: 'text' | 'video' | 'image' | 'link'
  mediaUrl?: string
  timestamp: string
  userId?: string
  isRead?: boolean
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
  const [selectedChat, setSelectedChat] = useState<{ type: 'public' | 'private'; id: string; name: string; avatar?: string; role?: string } | null>(null)
  const [isPrivateView, setIsPrivateView] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showAllUsers, setShowAllUsers] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isSending, setIsSending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [allUsers, setAllUsers] = useState<LoungeUser[]>([])
  const [recentChats, setRecentChats] = useState<any[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)
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
  }, [messages, selectedChat])

  // Handle responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setShowSidebar(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Determine public vs private mode from the URL (?view=private).
  // Default /lounge shows only the public chat. /lounge?view=private
  // opens straight into direct messages.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const priv = params.get('view') === 'private'
    setIsPrivateView(priv)
    setSelectedChat(priv ? null : { type: 'public', id: 'main', name: 'Public Lounge' })
    // On mobile, only show the full-screen sidebar drawer when there's
    // no chat to display yet (private view, nothing picked). Otherwise
    // (public lounge, or once a chat is selected) show the actual chat,
    // not the list, so the sidebar doesn't sit on top of it.
    if (window.innerWidth < 1024) {
      setShowSidebar(priv)
    }
  }, [])

  // Private DMs are scoped to agent<->bridger management: agents see their
  // assigned bridgers, bridgers see their one assigned agent. No general
  // user-to-user messaging.
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('ssb_auth_token')
        const response = await fetch('/api/lounge/management-contacts', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.contacts) {
            setAllUsers(data.contacts.filter((u: LoungeUser) => u.id !== user?.id))
          }
        }
      } catch (error) {
        console.error('Failed to fetch management contacts:', error)
      }
    }
    if (user) fetchUsers()
  }, [user])

  // Fetch recent chats
  useEffect(() => {
    const fetchRecentChats = async () => {
      if (!user?.id) return
      try {
        setLoadingRecent(true)
        const token = localStorage.getItem('ssb_auth_token')
        const response = await fetch(`/api/lounge/conversations`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        if (response.ok) {
          const data = await response.json()
          if (data.success) setRecentChats(data.conversations || [])
        }
      } catch (e) {
        console.log('Failed to fetch recent chats', e)
      } finally {
        setLoadingRecent(false)
      }
    }
    if (user) fetchRecentChats()
    const interval = setInterval(fetchRecentChats, 10000)
    return () => clearInterval(interval)
  }, [user])

  // Fetch notifications count
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return
      try {
        const token = localStorage.getItem('ssb_auth_token')
        const response = await fetch(`/api/notifications?userId=${user.id}&unreadOnly=true`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
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

  // Fetch messages for the selected chat
  useEffect(() => {
    if (!selectedChat || !user) return

    const fetchMessages = async () => {
      const roomId = selectedChat.type === 'private' 
        ? [user.id, selectedChat.id].sort().join('-')
        : 'main'
      
      try {
        const token = localStorage.getItem('ssb_auth_token')
        const response = await fetch(`/api/lounge/messages?roomType=${selectedChat.type}&roomId=${roomId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.messages) {
            // Reverse messages to show oldest at top, newest at bottom for chat feel
            setMessages([...data.messages].reverse())
          }
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error)
      } finally {
        setIsLoading(false)
      }
    }

    setIsLoading(true)
    fetchMessages()
    
    // Mark notifications from this user as read if private
    if (selectedChat.type === 'private') {
      const markRead = async () => {
        try {
          const token = localStorage.getItem('ssb_auth_token')
          const notifRes = await fetch(`/api/notifications?userId=${user.id}&unreadOnly=true`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          })
          if (notifRes.ok) {
            const notifData = await notifRes.json()
            if (notifData.success) {
              const relevantIds = notifData.notifications
                .filter((n: any) => n.from_user_id === selectedChat.id)
                .map((n: any) => n.id)
              
              if (relevantIds.length > 0) {
                await fetch('/api/notifications', {
                  method: 'PUT',
                  headers: { 
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                  },
                  body: JSON.stringify({ notificationIds: relevantIds, isRead: true })
                })
                setUnreadCount(prev => Math.max(0, prev - relevantIds.length))
              }
            }
          }
        } catch (err) {
          console.error('Failed to mark notifications as read:', err)
        }
      }
      markRead()
    }

    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [selectedChat, user])

  const handleSendMessage = async () => {
    if ((!messageInput.trim() && !mediaUrl) || !user || !selectedChat) return

    setIsSending(true)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const roomId = selectedChat.type === 'private' 
        ? [user.id, selectedChat.id].sort().join('-')
        : 'main'

      const response = await fetch('/api/lounge/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          sender: user.name,
          senderAvatar: '👤',
          senderRole: user.role,
          content: messageInput,
          userId: user.id,
          roomType: selectedChat.type,
          roomId,
          messageType: mediaUrl ? mediaType : 'text',
          mediaUrl: mediaUrl || null,
          recipientId: selectedChat.type === 'private' ? selectedChat.id : null,
          recipientName: selectedChat.type === 'private' ? selectedChat.name : null,
        }),
      })

      const data = await response.json()
      
      if (response.ok && data.success) {
        setMessages(prev => [...prev, data])
        
        // Send notification if private
        if (selectedChat.type === 'private') {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              userId: selectedChat.id,
              type: 'message',
              title: `New message from ${user.name}`,
              content: messageInput.substring(0, 100) || (mediaUrl ? 'Shared media' : ''),
              fromUserId: user.id,
              fromUserName: user.name,
              link: '/lounge',
            }),
          })
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

  const handleDeleteMessage = async (messageId: string) => {
    if (!user?.id) return
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch(`/api/lounge/messages?id=${messageId}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await response.json()
      if (data.success) {
        setMessages(prev => prev.filter(m => m.id !== messageId))
        toast.success('Removed')
      } else {
        toast.error(data.error || "That didn't remove")
      }
    } catch (error) {
      console.error('Delete message error:', error)
      toast.error("That didn't remove")
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

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    return `${Math.floor(diffInSeconds / 86400)}d`
  }

  const renderMessage = (msg: Message) => {
    const badge = getRoleBadge(msg.senderRole)
    const BadgeIcon = badge.icon
    const isOwnMessage = msg.sender === user?.name || msg.userId === user?.id
    
    return (
      <div key={msg.id} className={`flex gap-3 group ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
        {!isOwnMessage && (
          <span className="text-xl flex-shrink-0 w-8 h-8 flex items-center justify-center bg-slate-800 rounded-full">{msg.senderAvatar || '👤'}</span>
        )}
        <div className={`flex-1 min-w-0 flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          <div className={`flex items-center gap-2 mb-1 flex-wrap ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
            <p className="font-bold text-white text-[11px] opacity-70">{isOwnMessage ? 'You' : msg.sender}</p>
            {!isOwnMessage && msg.senderRole && (
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${badge.color}`}>
                <BadgeIcon className="h-2 w-2" />
                {badge.label}
              </span>
            )}
            <span className="text-[10px] text-slate-500 font-medium">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="relative group/msg max-w-[85%] sm:max-w-[70%]">
            <div className={`rounded-2xl px-4 py-2.5 shadow-sm relative ${
              isOwnMessage 
                ? 'bg-cyan-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50'
            }`}>
              {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap pr-4">{msg.content}</p>}
              
              {/* Media rendering */}
              {msg.mediaUrl && msg.messageType === 'video' && (
                <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
                  {isYouTubeUrl(msg.mediaUrl) ? (
                    <iframe src={`https://www.youtube.com/embed/${getYouTubeId(msg.mediaUrl)}`} className="w-full aspect-video" allowFullScreen />
                  ) : (
                    <video src={msg.mediaUrl} controls className="w-full" />
                  )}
                </div>
              )}
              {msg.mediaUrl && msg.messageType === 'image' && (
                <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
                  <img src={msg.mediaUrl} alt="Shared" className="w-full cursor-pointer hover:opacity-95 transition" onClick={() => window.open(msg.mediaUrl, '_blank')} />
                </div>
              )}

              {/* WhatsApp-style Checkmarks */}
              {isOwnMessage && (
                <div className="absolute bottom-1 right-2 flex">
                  <svg viewBox="0 0 16 11" width="12" height="9" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 5L5 9L14 1" stroke={msg.isRead ? "#34B7F1" : "#E2E8F0"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M5 5L9 9L18 1" stroke={msg.isRead ? "#34B7F1" : "#E2E8F0"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="translate(-4,0)"/>
                  </svg>
                </div>
              )}
            </div>

            {/* Delete button - shows on hover */}
            {isOwnMessage && (
              <button 
                onClick={() => handleDeleteMessage(msg.id)}
                className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-900/80 text-slate-500 hover:text-red-400 opacity-0 group-hover/msg:opacity-100 transition-all border border-slate-800"
                title="Delete message"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderMessageInput = () => (
    <div className="p-4 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800">
      {showMediaInput && (
        <div className="mb-3 space-y-3 bg-slate-800/80 rounded-xl p-4 border border-slate-700 animate-in slide-in-from-bottom-2">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <button 
                onClick={() => setMediaType('video')}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition ${mediaType === 'video' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400'}`}
              >
                Video
              </button>
              <button 
                onClick={() => setMediaType('image')}
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition ${mediaType === 'image' ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400'}`}
              >
                Image
              </button>
            </div>
            <button onClick={() => { setShowMediaInput(false); setMediaUrl(''); }} className="text-slate-400 hover:text-white transition">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input
            type="text"
            placeholder={mediaType === 'video' ? "Paste YouTube or direct video URL..." : "Paste image URL..."}
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition"
          />
        </div>
      )}
      <div className="flex gap-3 items-end">
        <div className="flex gap-1 pb-1">
          <button 
            onClick={() => { setShowMediaInput(!showMediaInput); setMediaType('video'); }}
            className={`p-2 rounded-xl transition ${showMediaInput && mediaType === 'video' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <Video className="h-5 w-5" />
          </button>
          <button 
            onClick={() => { setShowMediaInput(!showMediaInput); setMediaType('image'); }}
            className={`p-2 rounded-xl transition ${showMediaInput && mediaType === 'image' ? 'bg-cyan-500 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'}`}
          >
            <Image className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 relative">
          <textarea
            placeholder={`Message ${selectedChat?.name}...`}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            rows={1}
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none max-h-32 scrollbar-hide"
          />
        </div>
        <Button 
          onClick={handleSendMessage}
          disabled={isSending || (!messageInput.trim() && !mediaUrl)}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white rounded-2xl h-11 w-11 p-0 transition-all active:scale-95"
        >
          {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex h-[calc(100vh-140px)] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl relative">
      {/* Sidebar */}
      <div className={`w-full lg:w-80 flex flex-col border-r border-slate-800 bg-slate-900/30 absolute lg:relative z-20 h-full transition-transform duration-300 ${showSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-2">
          {isPrivateView ? (
            <div className="relative group flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-cyan-400 transition" />
              <input
                type="text"
                placeholder="Search team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-800/40 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition"
              />
            </div>
          ) : (
            <p className="text-sm font-bold text-white flex-1">Public Lounge</p>
          )}
          {isPrivateView && (
            <Button 
              variant="ghost" 
              size="icon" 
              className={`h-9 w-9 rounded-xl transition-all ${showAllUsers ? 'bg-cyan-500 text-white' : 'bg-slate-800/50 text-slate-400'}`}
              onClick={() => { setShowAllUsers(!showAllUsers); setSearchQuery(''); }}
              title={showAllUsers ? "Back to chats" : "New Chat"}
            >
              {showAllUsers ? <ChevronLeft className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={() => setShowSidebar(false)}>
            <X className="h-5 w-5 text-slate-500" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-hide">
          {showAllUsers ? (
            <div className="space-y-1 animate-in slide-in-from-right-2 duration-200">
              <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">New Management Chat</p>
              {allUsers.length === 0 ? (
                <p className="px-3 text-xs text-slate-600">No users available</p>
              ) : (
                allUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedChat({ type: 'private', id: u.id, name: u.name, avatar: u.avatar, role: u.role })
                      setShowAllUsers(false)
                      if (window.innerWidth < 1024) setShowSidebar(false)
                    }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-slate-800/50 transition border border-transparent hover:border-slate-700/50"
                  >
                    <span className="text-2xl w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full border border-slate-700">{u.avatar || '👤'}</span>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-bold text-white truncate">{u.name}</p>
                      <p className="text-[10px] opacity-60">@{u.username} • {u.role}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <>
              {/* Public Lounge Link */}
              {!searchQuery && !isPrivateView && (
                <div>
                  <button
                    onClick={() => {
                      setSelectedChat({ type: 'public', id: 'main', name: 'Public Lounge' })
                      if (window.innerWidth < 1024) setShowSidebar(false)
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${
                      selectedChat?.type === 'public' ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-[0_0_15px_-5px_rgba(6,182,212,0.3)]' : 'text-slate-400 hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                      selectedChat?.type === 'public' ? 'bg-cyan-500/20 border-cyan-500/30' : 'bg-slate-800 border-slate-700'
                    }`}>
                      <MessageCircle className={`h-5 w-5 ${selectedChat?.type === 'public' ? 'text-cyan-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold">Public Lounge</p>
                      <p className="text-[10px] opacity-60">Global ecosystem chat</p>
                    </div>
                  </button>
                </div>
              )}

              {/* Search Results */}
              {searchQuery && isPrivateView && (
                <div className="space-y-1">
                  <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">People</p>
                  {filteredUsers.length === 0 ? (
                    <p className="px-3 text-xs text-slate-600">No users found</p>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setSelectedChat({ type: 'private', id: u.id, name: u.name, avatar: u.avatar, role: u.role })
                          setSearchQuery('')
                          if (window.innerWidth < 1024) setShowSidebar(false)
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-slate-400 hover:bg-slate-800/50 transition border border-transparent hover:border-slate-700/50"
                      >
                        <span className="text-2xl w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full border border-slate-700">{u.avatar || '👤'}</span>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-bold text-white truncate">{u.name}</p>
                          <p className="text-[10px]">@{u.username}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Recent Direct Messages */}
              {!searchQuery && isPrivateView && recentChats.length > 0 && (
                <div className="space-y-1">
                  <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Management</p>
                  {recentChats.map((chat: any) => {
                    const otherUserId = chat.room_id.startsWith(`${user?.id}-`)
                      ? chat.room_id.slice((user?.id?.length ?? 0) + 1)
                      : chat.room_id.slice(0, chat.room_id.length - (user?.id?.length ?? 0) - 1)
                    const matchedUser = allUsers.find((u) => u.id === otherUserId)
                    const isActive = selectedChat?.type === 'private' && (selectedChat.id === otherUserId || selectedChat.id === chat.user_id)
                    const displayName = matchedUser?.name || chat.sender
                    
                    return (
                      <button
                        key={chat.room_id}
                        onClick={() => {
                          setSelectedChat({ 
                            type: 'private', 
                            id: otherUserId || chat.user_id, 
                            name: displayName, 
                            avatar: matchedUser?.avatar || chat.senderAvatar,
                            role: matchedUser?.role || chat.senderRole 
                          })
                          if (window.innerWidth < 1024) setShowSidebar(false)
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all border ${
                          isActive ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 shadow-sm' : 'text-slate-400 hover:bg-slate-800/40 border-transparent'
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <span className="text-2xl w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full border border-slate-700">
                            {matchedUser?.avatar || chat.senderAvatar || '👤'}
                          </span>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 bg-green-500 shadow-sm"></div>
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex justify-between items-center mb-0.5">
                            <p className={`text-sm font-bold truncate ${isActive ? 'text-cyan-400' : 'text-white'}`}>{displayName}</p>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-[10px] opacity-50 font-medium">{formatRelativeTime(chat.timestamp)}</span>
                              {chat.unreadCount > 0 && (
                                <span className="bg-cyan-500 text-slate-950 text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[16px] text-center shadow-lg shadow-cyan-900/20">
                                  {chat.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-[11px] truncate opacity-60 leading-tight pr-4">
                            {chat.user_id === user?.id && <span className="text-cyan-500 font-bold mr-1">You:</span>}
                            {chat.content || (chat.messageType === 'image' ? '📷 Photo' : '🎥 Video')}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Current User Info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-slate-700/50 shadow-inner">
            <span className="text-xl">👤</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.name}</p>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">{user?.role} • Online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-950/50 w-full">
        {selectedChat ? (
          selectedChat.type === 'public' ? (
            <StatusFeed user={user} />
          ) : (
          <>
            {/* Chat Header */}
            <div className="h-16 px-4 lg:px-6 flex items-center justify-between border-b border-slate-800 bg-slate-900/30 backdrop-blur-md z-10">
              <div className="flex items-center gap-3 lg:gap-4 min-w-0">
                <Button variant="ghost" size="icon" className="lg:hidden -ml-2 text-slate-400" onClick={() => setShowSidebar(true)}>
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                {selectedChat.type === 'private' ? (
                  <span className="text-2xl lg:text-3xl w-10 h-10 flex-shrink-0 flex items-center justify-center bg-slate-800 rounded-full">{selectedChat.avatar || '👤'}</span>
                ) : (
                  <div className="w-10 h-10 flex-shrink-0 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                    <MessageCircle className="h-5 w-5 text-cyan-400" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm lg:text-base font-bold text-white truncate">{selectedChat.name}</h2>
                    {selectedChat.role && (
                      <span className={`hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getRoleBadge(selectedChat.role).color}`}>
                        {getRoleBadge(selectedChat.role).label}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    Management • Active
                  </p>
                </div>
              </div>
              <div className="flex gap-1 sm:gap-2">
                <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
                  <Bell className="h-5 w-5" />
                </Button>
                {selectedChat.type === 'private' && (
                  <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
                    <Users className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 scrollbar-hide">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
                  <p className="text-sm text-slate-500 font-medium">Syncing messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center">
                    <MessageCircle className="h-10 w-10 text-slate-700" />
                  </div>
                  <div className="max-w-xs">
                    <p className="text-lg font-bold text-white mb-1">No messages yet</p>
                    <p className="text-sm text-slate-500 leading-relaxed">Break the ice and start a conversation. Your messages are secure and synced.</p>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map(renderMessage)}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            {renderMessageInput()}
          </>
          )
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 rounded-[2.5rem] bg-slate-900 border border-slate-800 flex items-center justify-center mb-6 shadow-2xl">
              <MessageSquare className="h-12 w-12 text-slate-700" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to the Lounge</h2>
            <p className="text-slate-500 max-w-sm leading-relaxed">
              Select a conversation from the sidebar or search for a team member to start chatting.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
