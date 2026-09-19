'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, CheckCircle2, XCircle, UserCog } from 'lucide-react'
import { toast } from 'sonner'

interface Application {
  id: string
  agent_id: string
  agent_name: string
  agent_email: string
  channel: string
  status: 'pending' | 'approved' | 'rejected'
  applied_at: string
}

const CHANNEL_LABEL: Record<string, string> = {
  mandate: 'Mandate Officer',
  forensic: 'Forensic Expert',
  lawyer: 'Legal Counsel',
}

export default function AdminAgentChannelsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    fetchApplications()
  }, [user])

  const fetchApplications = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/agent-channel-applications', {
        headers: { Authorization: `Bearer ${localStorage.getItem('ssb_auth_token')}` },
      })
      const data = await res.json()
      if (data.success) setApplications(data.applications)
    } catch (error) {
      toast.error('Failed to load applications')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReview = async (applicationId: string, status: 'approved' | 'rejected') => {
    setReviewingId(applicationId)
    try {
      const res = await fetch('/api/admin/agent-channel-applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ssb_auth_token')}`,
        },
        body: JSON.stringify({ applicationId, status }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Application ${status}`)
        fetchApplications()
      } else {
        toast.error(data.error || 'Failed to review')
      }
    } catch (error) {
      toast.error('Failed to review application')
    } finally {
      setReviewingId(null)
    }
  }

  const statusBadge = (status: string) => {
    if (status === 'approved') return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Approved</Badge>
    if (status === 'pending') return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>
    return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Rejected</Badge>
  }

  if (isLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-700" /></div>
  }

  const pending = applications.filter(a => a.status === 'pending')
  const reviewed = applications.filter(a => a.status !== 'pending')

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-4">
      <div className="flex items-center gap-4">
        <div className="bg-cyan-600 p-3 rounded-xl">
          <UserCog className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Channel Applications</h1>
          <p className="text-sm text-slate-500">Review agent requests to handle Mandate, Forensic, or Legal client conversations.</p>
        </div>
      </div>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <CardTitle className="text-base">Pending Review</CardTitle>
          <CardDescription className="text-xs">{pending.length} awaiting decision</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">Nothing pending.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="text-white font-medium text-sm">{app.agent_name}</div>
                      <div className="text-xs text-slate-500">{app.agent_email}</div>
                    </TableCell>
                    <TableCell className="text-slate-300 text-sm">{CHANNEL_LABEL[app.channel] || app.channel}</TableCell>
                    <TableCell className="text-xs text-slate-500">{new Date(app.applied_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        disabled={reviewingId === app.id}
                        onClick={() => handleReview(app.id, 'approved')}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reviewingId === app.id}
                        onClick={() => handleReview(app.id, 'rejected')}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-900/60 border-slate-800">
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          {reviewed.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No reviewed applications yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviewed.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="text-white text-sm">{app.agent_name}</TableCell>
                    <TableCell className="text-slate-300 text-sm">{CHANNEL_LABEL[app.channel] || app.channel}</TableCell>
                    <TableCell>{statusBadge(app.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
