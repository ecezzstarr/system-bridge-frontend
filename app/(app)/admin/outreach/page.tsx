'use client'
import { getAuthHeaders } from '@/lib/auth-client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, ShieldCheck, MessageSquare, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface Outreach {
  id: string
  contact_name: string | null
  phone: string
  bridger_name: string
  message_sent: string
  status: string
  sent_at: string | null
  last_activity_at: string
  created_at: string
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: 'Not Sent Yet', color: 'border-slate-500/20 text-slate-400 bg-slate-500/5' },
  sent: { label: 'Message Sent', color: 'border-blue-500/20 text-blue-400 bg-blue-500/5' },
  opened: { label: 'Entered System Switch', color: 'border-yellow-500/20 text-yellow-500 bg-yellow-500/5' },
  responded: { label: 'In System Switch', color: 'border-cyan-500/20 text-cyan-400 bg-cyan-500/5' },
  converted: { label: 'Converted — Client', color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' },
  invalid_number: { label: 'Not on WhatsApp', color: 'border-red-500/20 text-red-400 bg-red-500/5' },
}

export default function OutreachTerminalPage() {
  const [outreach, setOutreach] = useState<Outreach[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchOutreach()
  }, [])

  const fetchOutreach = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/market/prospects/outreach/pending', { headers: getAuthHeaders() })
      const data = await res.json()
      if (data.success) {
        setOutreach(data.pending)
      }
    } catch (error) {
      toast.error('Failed to load outreach funnel')
    } finally {
      setIsLoading(false)
    }
  }

  const enteredCount = outreach.filter(o => ['opened', 'responded', 'converted'].includes(o.status)).length

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center gap-4">
        <div className="bg-green-600 p-3 rounded-xl shadow-lg shadow-green-900/20">
          <ShieldCheck className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Fulfillment Agent</h1>
          <p className="text-slate-400 font-medium">WEAVE Ecosystem · Outreach & Compliance Authority</p>
        </div>
      </div>

      <Card className="border-slate-700 bg-slate-900/50 backdrop-blur-xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold">Outreach Funnel</CardTitle>
            <CardDescription className="text-xs">
              Read-only view. Bridgers send their own first message — this confirms when each prospect actually enters System Switch ({enteredCount} entered so far).
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchOutreach} className="border-slate-700 text-slate-400">
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-700" />
            </div>
          ) : (
            <div className="rounded-md border border-slate-800 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-800/50">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Prospect</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bridger</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Message Preview</TableHead>
                    <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</TableHead>
                    <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Activity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outreach.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-20 text-slate-500 text-xs italic">
                        No outreach yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    outreach.map((o) => {
                      const st = STATUS_LABEL[o.status] || STATUS_LABEL.pending
                      return (
                        <TableRow key={o.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white uppercase">{o.contact_name || 'Anonymous'}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{o.phone}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-300 font-medium">{o.bridger_name}</TableCell>
                          <TableCell className="max-w-md">
                            <p className="text-[10px] text-slate-400 italic line-clamp-2 bg-slate-800/30 p-2 rounded">
                              "{o.message_sent}"
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[8px] uppercase ${st.color}`}>
                              {st.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-[10px] text-slate-500 font-mono">
                            {new Date(o.last_activity_at).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-700 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-400" />
              Recent Conversations
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-10">
            <p className="text-slate-500 text-[10px] font-bold uppercase italic">No active conversations yet.</p>
          </CardContent>
        </Card>
        
        <Card className="border-slate-700 bg-slate-900/50 backdrop-blur-xl md:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-purple-400" />
              Conversion Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center py-10">
            <p className="text-slate-500 text-[10px] font-bold uppercase italic">Conversion data will appear as prospects cross the Bridge.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
