'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Trash2, Image as ImageIcon, Video, X, Loader2, Send, Shield, UserCheck, User } from 'lucide-react'
import { toast } from 'sonner'

interface Post {
  id: string
  userId: string
  authorName: string
  authorRole: string
  authorAvatar: string
  content: string
  mediaUrl?: string
  mediaType?: 'image' | 'video'
  createdAt: string
  likeCount: number
  commentCount: number
  likedByMe: boolean
  witnessName?: string
  milestoneType?: string
}

interface Comment {
  id: string
  postId: string
  userId: string
  authorName: string
  authorRole: string
  content: string
  createdAt: string
}

const getRoleBadge = (role?: string) => {
  switch (role?.toLowerCase()) {
    case 'admin': return { icon: Shield, color: 'text-red-400 bg-red-500/20', label: 'Admin' }
    case 'agent': return { icon: UserCheck, color: 'text-cyan-400 bg-cyan-500/20', label: 'Agent' }
    case 'bridger': return { icon: User, color: 'text-emerald-400 bg-emerald-500/20', label: 'Bridger' }
    case 'system_switch': return { icon: UserCheck, color: 'text-amber-400 bg-amber-500/20', label: 'Crossing' }
    default: return { icon: User, color: 'text-slate-400 bg-slate-500/20', label: 'User' }
  }
}

const formatRelativeTime = (timestamp: string) => {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  if (diff < 60) return 'now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function StatusFeed({ user }: { user: any }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [postText, setPostText] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)
  const [isPosting, setIsPosting] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({})
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('ssb_auth_token')
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  const fetchPosts = async () => {
    try {
      const res = await fetch('/api/status-feed/posts', { headers: authHeaders() as any })
      const data = await res.json()
      if (data.success) setPosts(data.posts)
    } catch (err) {
      console.error('Failed to fetch posts:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
    const interval = setInterval(fetchPosts, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPendingFile(file)
    setPendingPreview(URL.createObjectURL(file))
  }

  const clearPendingMedia = () => {
    setPendingFile(null)
    setPendingPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePost = async () => {
    if (!postText.trim() && !pendingFile) return
    setIsPosting(true)
    try {
      let mediaUrl: string | null = null
      let mediaType: string | null = null

      if (pendingFile) {
        const formData = new FormData()
        formData.append('file', pendingFile)
        const uploadRes = await fetch('/api/status-feed/upload', {
          method: 'POST',
          headers: authHeaders() as any,
          body: formData,
        })
        const uploadData = await uploadRes.json()
        if (!uploadData.success) {
          toast.error(uploadData.error || "That didn't upload")
          setIsPosting(false)
          return
        }
        mediaUrl = uploadData.url
        mediaType = uploadData.mediaType
      }

      const res = await fetch('/api/status-feed/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ content: postText, mediaUrl, mediaType }),
      })
      const data = await res.json()
      if (data.success) {
        setPosts(prev => [data.post, ...prev])
        setPostText('')
        clearPendingMedia()
      } else {
        toast.error(data.error || "That didn't post")
      }
    } catch (err) {
      console.error('Post error:', err)
      toast.error("That didn't post")
    } finally {
      setIsPosting(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/status-feed/posts?id=${postId}`, {
        method: 'DELETE',
        headers: authHeaders() as any,
      })
      const data = await res.json()
      if (data.success) {
        setPosts(prev => prev.filter(p => p.id !== postId))
        toast.success('Removed')
      } else {
        toast.error(data.error || "That didn't remove")
      }
    } catch (err) {
      console.error('Delete post error:', err)
    }
  }

  const handleToggleLike = async (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId
      ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
      : p
    ))
    try {
      await fetch(`/api/status-feed/posts/${postId}/like`, {
        method: 'POST',
        headers: authHeaders() as any,
      })
    } catch (err) {
      console.error('Like error:', err)
    }
  }

  const toggleComments = async (postId: string) => {
    const next = new Set(expandedComments)
    if (next.has(postId)) {
      next.delete(postId)
      setExpandedComments(next)
      return
    }
    next.add(postId)
    setExpandedComments(next)

    if (!commentsByPost[postId]) {
      try {
        const res = await fetch(`/api/status-feed/posts/${postId}/comments`, { headers: authHeaders() as any })
        const data = await res.json()
        if (data.success) {
          setCommentsByPost(prev => ({ ...prev, [postId]: data.comments }))
        }
      } catch (err) {
        console.error('Fetch comments error:', err)
      }
    }
  }

  const handleAddComment = async (postId: string) => {
    const content = commentInput[postId]?.trim()
    if (!content) return
    try {
      const res = await fetch(`/api/status-feed/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (data.success) {
        setCommentsByPost(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data.comment] }))
        setCommentInput(prev => ({ ...prev, [postId]: '' }))
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p))
      }
    } catch (err) {
      console.error('Add comment error:', err)
    }
  }

  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      const res = await fetch(`/api/status-feed/posts/${postId}/comments?commentId=${commentId}`, {
        method: 'DELETE',
        headers: authHeaders() as any,
      })
      const data = await res.json()
      if (data.success) {
        setCommentsByPost(prev => ({ ...prev, [postId]: prev[postId].filter(c => c.id !== commentId) }))
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, commentCount: Math.max(0, p.commentCount - 1) } : p))
      }
    } catch (err) {
      console.error('Delete comment error:', err)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-4 lg:p-6 space-y-4 scrollbar-hide">
      {/* Composer */}
        {user?.role === 'admin' && (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <textarea
          value={postText}
          onChange={(e) => setPostText(e.target.value)}
          placeholder="Share an update, a quote, a photo, or a video..."
          className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 resize-none outline-none min-h-[60px]"
        />
        {pendingPreview && (
          <div className="relative mt-2 rounded-xl overflow-hidden border border-white/10 max-w-xs">
            <button onClick={clearPendingMedia} className="absolute top-2 right-2 z-10 p-1 rounded-full bg-slate-900/80 text-white hover:bg-red-500/80">
              <X className="h-4 w-4" />
            </button>
            {pendingFile?.type.startsWith('video/') ? (
              <video src={pendingPreview} controls className="w-full" />
            ) : (
              <img src={pendingPreview} alt="Preview" className="w-full" />
            )}
          </div>
        )}
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition">
              <ImageIcon className="h-5 w-5" />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-cyan-400 transition">
              <Video className="h-5 w-5" />
            </button>
          </div>
          <Button
            onClick={handlePost}
            disabled={isPosting || (!postText.trim() && !pendingFile)}
            className="bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl"
          >
            {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
          </Button>
        </div>
      </div>
        )}

      {/* Feed */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-8 w-8 text-cyan-500 animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-lg font-bold text-white mb-1">No posts yet</p>
          <p className="text-sm text-slate-500">Be the first to share an update.</p>
        </div>
      ) : (
        posts.map((post) => {
          const badge = getRoleBadge(post.authorRole)
          const BadgeIcon = badge.icon
          const isOwn = post.userId === user?.id
          const canDelete = isOwn || user?.role === 'admin'
          const isExpanded = expandedComments.has(post.id)

          return (
            <div key={post.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {post.authorAvatar?.startsWith('http') ? (
                    <img src={post.authorAvatar} alt={post.authorName} className="w-8 h-8 rounded-full object-cover border border-slate-700" />
                  ) : (
                    <span className="text-xl w-8 h-8 flex items-center justify-center bg-slate-800 rounded-full">{post.authorAvatar}</span>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white text-sm">{post.authorName}</p>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${badge.color}`}>
                        <BadgeIcon className="h-2 w-2" />
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500">{formatRelativeTime(post.createdAt)}</p>
                      {post.witnessName && (
                        <p className="text-[10px] text-amber-400/80 mt-0.5">Witnessed by {post.witnessName}</p>
                      )}
                  </div>
                </div>
                {canDelete && (
                  <button onClick={() => handleDeletePost(post.id)} className="text-slate-500 hover:text-red-400 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {post.content && <p className="text-sm text-slate-200 whitespace-pre-wrap mb-2">{post.content}</p>}

              {post.mediaUrl && post.mediaType === 'image' && (
                <div className="rounded-xl overflow-hidden border border-white/10 mb-2">
                  <img src={post.mediaUrl} alt="Post media" className="w-full cursor-pointer" onClick={() => window.open(post.mediaUrl, '_blank')} />
                </div>
              )}
              {post.mediaUrl && post.mediaType === 'video' && (
                <div className="rounded-xl overflow-hidden border border-white/10 mb-2">
                  <video src={post.mediaUrl} controls className="w-full" />
                </div>
              )}

              <div className="flex items-center gap-4 pt-2 border-t border-slate-800">
                <button onClick={() => handleToggleLike(post.id)} className={`flex items-center gap-1.5 text-xs font-medium transition ${post.likedByMe ? 'text-red-400' : 'text-slate-400 hover:text-red-400'}`}>
                  <Heart className={`h-4 w-4 ${post.likedByMe ? 'fill-red-400' : ''}`} />
                  {post.likeCount}
                </button>
                <button onClick={() => toggleComments(post.id)} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-cyan-400 transition">
                  <MessageCircle className="h-4 w-4" />
                  {post.commentCount}
                </button>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
                  {(commentsByPost[post.id] || []).map((c) => (
                    <div key={c.id} className="flex items-start justify-between gap-2 bg-slate-800/50 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-xs font-bold text-white">{c.authorName} <span className="text-slate-500 font-normal">· {formatRelativeTime(c.createdAt)}</span></p>
                        <p className="text-xs text-slate-300">{c.content}</p>
                      </div>
                      {(c.userId === user?.id || user?.role === 'admin') && (
                        <button onClick={() => handleDeleteComment(post.id, c.id)} className="text-slate-500 hover:text-red-400 flex-shrink-0">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      value={commentInput[post.id] || ''}
                      onChange={(e) => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                      placeholder="Write a comment..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none"
                    />
                    <button onClick={() => handleAddComment(post.id)} className="p-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white">
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
