'use client'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminWorkshop() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, router])

  if (!user || user.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <h1 className="text-4xl font-bold text-white">Admin Workshop</h1>
      <p className="text-slate-400 mt-2">Welcome back, {user.name}</p>
    </div>
  )
}
