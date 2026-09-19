'use client'

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

export function NotificationBell() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const knownIds = useRef<Set<string>>(new Set())
  const isFirstLoad = useRef(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio(
      'data:audio/wav;base64,UklGRoQJAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YWAJAAAAAHQYpyWQIRYOL/S+3yHa5OWc/WEW2SRlIiwQkPZT4THaaORD+z8U6SMTIygS8vgC42faDuP4+BES1iKbIwsUUfvI5MTa2OG99tgPpCH7I9EVrP2j5kXbxeCV9JcNVCA1JHoXAACR6Ovb19+B8lIL6B5JJAMZSgKP6rPcDt+D8AoJYR03JG0aigSc7J3dad6d7sEGwxv/I7Ybuwa17qbe693R7HsEDhqjI90c3QjW8M7fkd0g6zoCRRgkI+Ed7Qr/8hPhXd2L6QAAahaDIsIe6Qwt9XLiTt0V6M/9gBTAIYAfzw5c9+rjYt295qr7iBLeIBognhCL+Xnlmt2G5ZH5hhDdH5AgVBK4+x3n9d1u5In3ew6/HuIg7xPg/dToct5545L1agyGHREhbxUAAJvqEN+l4q7zVQo0HBwh0xYXAnHszd/z4eDxPgjLGgUhGBgjBFPuqOBj4SjwKAZLGcwgPxkiBj/woOH24IjuFQS5F3IgRhoRCDPys+Kr4AHtBgIUFvgfLhvwCS304OOC4JbrAABgFF4f9Bu7Cyr2JeV64EbqA/6eEqcemxxyDSj4geaU4BLpEPzRENMdIB0TDyX68OfO4P3nK/r7DuMchR2dEB/8cukn4QXnVfgeDdobyB0OEhP+BOuf4Szmj/Y8C7ka7B1lEwAApew04nLl3PRYCYEZ7x2iFOQBUu7m4tjkPPNyBzQY0x3DFbwDCvCz413ksvGOBdQWmR3IFogFyvGa5AHkP/CuA2MVQB2vF0YHkPOZ5cTj4+7TAeMTyxx6GPIIWvWu5qbjoO0AAFYSORwnGY0KJ/fZ56fjduw2/r0QjRu1GRUM9PgX6cXjaOt3/BsPxxomGogNvvpn6gHkdOrE+nEN6Rl6GuYOhfzH61jknOkg+cIL9RivGiwQR/417czk4OiM9w8K6xfHGlsRAACv7lnlQOgJ9lsIzRbDGnESsAE08ADmveeZ9KcGnRWiGm4TVgPB8b7mVuc98/UEXRRmGlAU7wRV85PnDOf28UcDDhMPGhkVegbt9H7o3ubE8KABshGeGcYV9QeI9nzpy+aq7wAATBAVGVkWYAkk+I3q1Oan7mr+2w50GNAWuAq/+a7r9+a97d78ZA28Fy0X/gtY+9/sNOfr7F775gvwFm4XLw3s/Bzuiucz7Oz5ZQoQFpYXSw56/mbv+OeU64n44QgdFaMXUQ8AALrwfugO6zf3XQcZFJYXQBB9ARXyGemi6vb12wUHE3AXGRHvAnjzyelQ6sj0WwTmETMX2RFVBN/0jeoX6q3z4QK5EN0WghKuBUr2Y+v36abybAGCD3EWExP4Brb3Suzw6bTxAABBDvAVixMyCCH5QO0A6tjwnf76DFoV6xNcCYv6Re4o6hLwRP2tC7EUMxRzCvH7Vu9n6mLv9/tbCvYTYxR4C1P9cfC86snuuPoICSoTfBRpDK7+l/El60fuhvm0B08SfhRHDQAAxPKi69ztZPhgBmYRaRQQDkkB9/My7IjtU/cPBXAQPxTDDogCL/XU7ErtUvbCA28P/xNiD7wDavaH7SLtY/V6AmQOrBPrD+IEpvdI7hHth/Q5AVENRRNfEPsF4/gY7xTtvvMAADcMyxK9EAUHHvr07y3tCfPR/hgLQRIGEf8HV/vc8FrtZ/Kr/fYJphE5EekIi/zN8Zrt2fGR/NEI/RBYEcEJuf3H8u3tYPGE+6sHRRBjEYgK4f7H81Lu+/CE+oYGgQ9ZET0LAADO9MfuqvCS+WMFsg49Ed8LFgHY9UzvbfCw+EME2Q0NEW4MIgLm9t/vQ/Dd9ygD+AzMEOsMIgP094DwLfAa9xMCDwx6EFUNFwQD+S3xKvBp9gUBIAsYEKsN/gQR+ubxOfDI9QAALQqnD+8N1wUb+6jyWvA69QT/NwknDyEOogYi/HLzjPC89BL+PwibDkAOXgck/UT0zfBR9Cr9RgcDDk0OCggg/hz1H/H380/8TgZgDUkOpggU//j1fvGv84H7WQWzDDUOMgkAANj27PF488D6ZgT+CxAOrgniALr3ZfJS8wz6eANCC9wNGQq7AZ346vI982f5jwKACpkNdAqJAn/5evM489H4rQG6CUkNvgpLA2D6E/RD80r40gDvCOsM+AoBBD77tPRe89P3AAAjCIIMIQuqBBn8W/WH82r3N/9VBw4MOwtFBe78Cfa98xH3eP6IBpALRgvTBb79u/YB9Mj2xP28BQkLQgtTBof+cfdQ9I72G/3yBHsKMAvFBkj/Kfir9GL2fvwrBOYJEAsoBwAA4vgQ9Ub27ftpA0sJ4wp9B68Am/l/9Tf2afusAqwIqgrEB1QBVPr29Tf28vr1AQkIZgr9B+8BCvt09kP2iPpGAWQHFwonCH8Cvfv49l32LPqeAL8GvwlECAQDbPyB94L23fkAABkGXQlUCHwDFv0P+LP2m/lr/3QF9QhWCOkDuv2g+O/2Z/nf/tEEhQhNCEkEV/4y+TT3P/ld/jEEEAg3CJwE7f7G+YL3JPnn/ZUDlQcWCOMEe/9a+tj3Fvl7/f0CGAfrBx4FAADs+jX4E/kb/WwClwa2B00FewB9+5j4HPnG/OABFQZ5B28F7gAL/AH5MPl9/FwBkgUzB4UFVgGU/G35T/k//N8ADwXlBpAFswEa/d35dvkN/GsAjgSSBpAFBgKZ/U/6p/nn+wAADwQ5BoYFTwIT/sP64PnM+57/kgPbBXEFjAKG/jb7IPq8+0b/GgN6BVMFvgLx/qr7Z/q2+/f+pgIWBSwF5QJU/xv8s/q7+7L+OAKwBP0EAgOv/4r8BfvK+3j+0AFKBMcEFAMAAPb8Wvvh+0j+bwHjA4oEHANIAF79svsC/CP+FQF+A0cEGgOHAMH9DPwq/Af+wgAbA/8DDgO8AB/+Z/xa/Pb9eQC6ArQD+gLoAHb+wvyQ/O/9OABdAmUD3QIJAcf+Hf3M/PH9AAAEAhQDuAIhARD/dv0N/f390v+xAcICjAIvAVH/zf1S/RH+rP9jAW8CWQIzAYr/If6a/S3+kP8cARwCIQIuAbv/cP7l/VL+fv/bAMsB4wEgAeL/u/4x/n3+df+iAHwBogEKAQAAAf9+/q/+dv9xADABXQHrABUAQP/L/uf+f/9JAOcAFQHFACAAeP8X/yT/kv8pAKQAzACXACMAqv9h/2X/rf8SAGUAggBjABwA0/+o/6n/0P8EACwAOAApAAwA9P/r//D/+/8='
    )
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${user.id}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success) {
            const list: Notification[] = data.notifications || []

            if (isFirstLoad.current) {
              list.forEach(n => knownIds.current.add(n.id))
              isFirstLoad.current = false
            } else {
              const freshOnes = list.filter(n => !n.is_read && !knownIds.current.has(n.id))
              if (freshOnes.length > 0) {
                audioRef.current?.play().catch(() => {})
                if ('Notification' in window && Notification.permission === 'granted') {
                  freshOnes.slice(0, 3).forEach(n => {
                    const popup = new Notification(n.title || 'New notification', {
                      body: n.content || '',
                      tag: n.id,
                    })
                    popup.onclick = () => {
                      window.focus()
                      if (n.link) window.location.href = n.link
                    }
                  })
                }
              }
              list.forEach(n => knownIds.current.add(n.id))
            }

            setNotifications(list)
            setUnreadCount(list.filter((n: Notification) => !n.is_read).length)
          }
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error)
      }
    }

    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000) // Poll every 10 seconds
    return () => clearInterval(interval)
  }, [user?.id])

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notificationId], isRead: true })
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
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, markAllRead: true })
      })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
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
          <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-slate-700">
              <h3 className="font-semibold text-white">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Mark all read
                </button>
              )}
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
                        <p className="text-xs text-slate-400 truncate">
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
                        {notification.link && (
                          <Link
                            href={notification.link}
                            onClick={() => {
                              markAsRead(notification.id)
                              setIsOpen(false)
                            }}
                            className="text-xs text-cyan-400 hover:text-cyan-300"
                          >
                            View
                          </Link>
                        )}
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
