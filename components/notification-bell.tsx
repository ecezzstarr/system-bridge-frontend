'use client'
import { visiblePoll } from '@/lib/visible-poll'

import { useState, useEffect, useRef } from 'react'
import { Bell, X, MessageCircle, Check } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  content: string
  from_user_name: string
  link: string
  is_read: boolean
  created_at: string
}

export function NotificationBell({position='phone'}:{position?:'phone'|'desktop'}) {
  const { user } = useAuth()
  const [deviceVisible,setDeviceVisible]=useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const knownIds = useRef<Set<string>>(new Set())
  const isFirstLoad = useRef(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(()=>{
    const desktop=window.matchMedia('(min-width: 768px)')
    const update=()=>setDeviceVisible(position==='desktop'?desktop.matches:!desktop.matches)
    update()
    desktop.addEventListener('change',update)
    return ()=>desktop.removeEventListener('change',update)
  },[position])

  const [soundEnabled, setSoundEnabled] = useState(true)
  const [soundReady, setSoundReady] = useState(false)
  const [soundUnavailable, setSoundUnavailable] = useState(false)
  const [soundBlocked, setSoundBlocked] = useState(false)

  useEffect(() => {
    setSoundEnabled(localStorage.getItem('weave_notification_sound') !== 'off')
    const audio = new Audio('/sounds/weave-river-birds.mp3')
    audio.preload = 'auto'
    audio.volume = 0.8
    const onError = () => setSoundUnavailable(true)
    audio.addEventListener('error', onError)
    audioRef.current = audio
    return () => {
      audio.pause()
      audio.removeEventListener('error', onError)
      if (audioRef.current === audio) audioRef.current = null
    }
  }, [])

  const playRiverAlert = async (force = false) => {
    if (!force && !soundEnabled) return
    const audio = audioRef.current
    if (!audio) return
    try {
      audio.pause()
      audio.currentTime = 0
      await audio.play()
      setSoundReady(true)
      setSoundBlocked(false)
    } catch {
      // Mobile browsers may require an explicit user tap before audible playback.
      setSoundBlocked(true)
    }
  }

  const setRiverSound = (enabled: boolean) => {
    setSoundEnabled(enabled)
    localStorage.setItem('weave_notification_sound', enabled ? 'on' : 'off')
    if (!enabled) {
      audioRef.current?.pause()
      setSoundBlocked(false)
    } else {
      void playRiverAlert(true)
    }
  }

  useEffect(() => {
    if (!user?.id||!deviceVisible) return

    const fetchNotifications = async (signal:AbortSignal) => {
      try {
        const token = localStorage.getItem('ssb_auth_token')
        const res = await fetch('/api/notifications', {
          signal,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const data = await res.json()
          if (data.success&&!signal.aborted) {
            const list: Notification[] = data.notifications || []

            if (isFirstLoad.current) {
              list.forEach(n => knownIds.current.add(n.id))
              isFirstLoad.current = false
            } else {
              const freshOnes = list.filter(n => !n.is_read && !knownIds.current.has(n.id))
              if (freshOnes.length > 0) {
                void playRiverAlert()
                if ('Notification' in window && Notification.permission === 'granted') {
                  freshOnes.slice(0, 3).forEach(n => {
                    try {
                      const popup = new Notification(n.title || 'New notification', {
                        body: n.content || '',
                        tag: n.id,
                      })
                      popup.onclick = () => {
                        window.focus()
                        window.location.href = '/notifications?open=' + encodeURIComponent(n.id)
                      }
                    } catch {
                      // Mobile browsers may disallow page-created system notifications.
                      // Keep the in-app inbox and approved river sound working anyway.
                    }
                  })
                }
              }
              list.forEach(n => knownIds.current.add(n.id))
            }

            knownIds.current=new Set(list.map(n=>n.id))
            setNotifications(current=>JSON.stringify(current)===JSON.stringify(list)?current:list)
            setUnreadCount(list.filter((n: Notification) => !n.is_read).length)
          }
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    const interval = visiblePoll(fetchNotifications, 5000) // Surface deposit/admin decisions promptly
    return () => interval()
  }, [user?.id,deviceVisible,soundEnabled])

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('ssb_auth_token')
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ notificationIds: [notificationId] })
      })
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!user?.id) return
    try {
      const token = localStorage.getItem('ssb_auth_token')
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ markAllRead: true })
      })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  if (!user||!deviceVisible) return null

  return (
    <div className="relative">
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if('Notification' in window&&Notification.permission==='default')void Notification.requestPermission()
        }}
        aria-label={`Notifications, ${unreadCount} unread`}
        className="relative p-2 text-slate-400 hover:text-white transition rounded-lg hover:bg-slate-800"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-[min(23rem,calc(100vw-1.5rem))] bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-slate-700">
              <div className="flex items-center gap-3"><h3 className="font-semibold text-white">Notifications</h3><Link href="/notifications" onClick={()=>setIsOpen(false)} className="text-xs font-bold text-cyan-200 hover:underline">View all messages</Link></div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-slate-700 px-3 py-2" data-weave-notification-sound="river-birds">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white">River &amp; Birds</p>
                <p className="text-[10px] text-slate-400">{soundUnavailable ? 'Sound file unavailable' : !soundEnabled ? 'Sound muted' : soundBlocked ? 'Tap Test to enable audio on this phone' : soundReady ? 'Sound ready' : 'Natural WEAVE notification sound'}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => void playRiverAlert(true)} disabled={soundUnavailable} className="rounded-lg border border-cyan-300/20 px-2 py-1.5 text-[10px] font-bold text-cyan-200 disabled:opacity-40">Test</button>
                <button type="button" onClick={() => setRiverSound(!soundEnabled)} aria-pressed={soundEnabled} className={`rounded-lg px-2 py-1.5 text-[10px] font-bold ${soundEnabled ? 'bg-cyan-400/15 text-cyan-100' : 'bg-slate-800 text-slate-300'}`}>{soundEnabled ? 'Sound On' : 'Sound Off'}</button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-slate-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 border-b border-slate-800 hover:bg-slate-800/50 transition ${
                      !notification.is_read ? 'bg-slate-800/30' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        notification.type === 'private_message' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400'
                      }`}>
                        <MessageCircle className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-400 line-clamp-2 break-words">
                          {notification.content}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(notification.created_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <Link
                            href={`/notifications?open=${encodeURIComponent(notification.id)}`}
                            onClick={() => {
                              setIsOpen(false)
                            }}
                            className="text-xs text-cyan-400 hover:text-cyan-300"
                          >
                            View message
                          </Link>
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-slate-500 hover:text-green-400"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
