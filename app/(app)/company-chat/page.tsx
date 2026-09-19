'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-provider'
import { useEffect } from 'react'
import { MessageCircle } from 'lucide-react'

const POSITIONS = [
  { id: 'mandate', name: 'Mandate Officer', desc: 'Onboarding, mandates, and process questions.', color: 'from-blue-500 to-cyan-500', icon: '📋' },
  { id: 'lawyer', name: 'Legal Counsel', desc: 'Contracts, compliance, and legal guidance.', color: 'from-purple-500 to-pink-500', icon: '⚖️' },
  { id: 'forensic', name: 'Forensic Expert', desc: 'Verification, audits, and investigations.', color: 'from-orange-500 to-red-500', icon: '🔍' },
  { id: 'admin', name: 'Administrator', desc: 'General account and platform support.', color: 'from-green-500 to-emerald-500', icon: '👤' },
]

export default function CompanyChatIndexPage() {
  const router = useRouter()
  const { user } = useAuth()

  useEffect(() => {
    if (!user) router.push('/login')
  }, [user, router])

  if (!user) return null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-cyan-400" />
          Company Support
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Reach WEAVE's service positions directly for guidance on your account.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {POSITIONS.map((pos) => (
          <button
            key={pos.id}
            onClick={() => router.push(`/company-chat/${pos.id}`)}
            className="text-left bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:bg-slate-900 hover:border-slate-700 transition"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${pos.color} flex items-center justify-center text-2xl mb-3`}>
              {pos.icon}
            </div>
            <h2 className="text-white font-bold">{pos.name}</h2>
            <p className="text-slate-400 text-sm mt-1">{pos.desc}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
