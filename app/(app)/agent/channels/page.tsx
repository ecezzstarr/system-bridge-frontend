'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, ShieldCheck, Scale, Search } from 'lucide-react'
import { toast } from 'sonner'

interface Application {
  id: string
  channel: string
  status: 'pending' | 'approved' | 'rejected'
  applied_at: string
}

const CHANNELS = [
  { id: 'mandate', name: 'Mandate Officer', icon: ShieldCheck, desc: 'Onboarding, mandates, and process questions.' },
  { id: 'forensic', name: 'Forensic Expert', icon: Search, desc: 'Verification, audits, and investigations.' },
  { id: 'lawyer', name: 'Legal Counsel', icon: Scale, desc: 'Contracts, compliance, and legal guidance.' },
]

export default function AgentChannelsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [applyingId, setApplyingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'agent') {
      router.push('/dashboard')
      return
    }
    fetchApplications()
  }, [user])

  const fetchApplications = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/agent/channel-applications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('ssb_auth_token')}` },
      })
      const data = await res.json()
      if (data.success) setApplications(data.applications)
    } catch (error) {
      toast.error('Failed to load channel status')
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = async (channel: string) => {
    setApplyingId(channel)
    try {
      const res = await fetch('/api/agent/channel-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ssb_auth_token')}`,
        },
        body: JSON.stringify({ channel }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Application submitted. Awaiting admin review.')
        fetchApplications()
      } else {
        toast.error(data.error || 'Failed to apply')
      }
    } catch (error) {
      toast.error('Failed to apply')
    } finally {
      setApplyingId(null)
    }
  }

  const statusFor = (channelId: string) => applications.find(a => a.channel === channelId)

  const statusBadge = (status?: string) => {
    if (!status) return null
    if (status === 'approved') return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Approved</Badge>
    if (status === 'pending') return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending Review</Badge>
    return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Rejected</Badge>
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-700" /></div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-2xl font-bold text-white">Channel Applications</h1>
        <p className="text-sm text-slate-500 mt-1">
          Apply to handle client conversations on a company support channel. Admin must approve each channel before you can respond to clients on it.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {CHANNELS.map((ch) => {
          const app = statusFor(ch.id)
          const Icon = ch.icon
          return (
            <Card key={ch.id} className="bg-slate-900/60 border-slate-800">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-cyan-400" />
                  <div>
                    <CardTitle className="text-base">{ch.name}</CardTitle>
                    <CardDescription className="text-xs">{ch.desc}</CardDescription>
                  </div>
                </div>
                {statusBadge(app?.status)}
              </CardHeader>
              <CardContent>
                {(!app || app.status === 'rejected') && (
                  <Button
                    size="sm"
                    onClick={() => handleApply(ch.id)}
                    disabled={applyingId === ch.id}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    {applyingId === ch.id ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                    {app?.status === 'rejected' ? 'Re-apply' : 'Apply'}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
