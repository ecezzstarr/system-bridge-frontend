'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, 
  Key, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Copy, 
  Loader2, 
  RefreshCw,
  MessageCircle,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { toast } from 'sonner'
import Link from 'next/link'
import { DepartmentEntryTicketsPanel } from '@/components/admin/department-entry-tickets-panel'

interface DepartmentalCode {
  id: string
  code: string
  department: 'AGENT' | 'BRIDGER'
  status: 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED'
  issued_by_name: string
  issued_at: string
  expires_at?: string
  used_by_name?: string
  used_at?: string
}

export function DepartmentalCodesSection() {
  const [codes, setCodes] = useState<DepartmentalCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isIssuing, setIsSubmitting] = useState(false)
  const [newCodeDept, setNewCodeDept] = useState<'AGENT' | 'BRIDGER'>('AGENT')
  const [expiresInDays, setExpiresInDays] = useState('7')

  useEffect(() => {
    fetchCodes()
  }, [])

  const fetchCodes = async () => {
    setIsLoading(true)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/departmental-codes', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.codes) {
        setCodes(data.codes)
      }
    } catch (error) {
      console.error('Failed to fetch codes:', error)
      toast.error('Failed to load departmental codes')
    } finally {
      setIsLoading(false)
    }
  }

  const handleIssueCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/admin/departmental-codes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          department: newCodeDept, 
          expiresInDays: parseInt(expiresInDays) 
        })
      })
      const data = await response.json()
      if (data.code) {
        toast.success(`Issued ${newCodeDept} code: ${data.code}`)
        fetchCodes()
      } else {
        toast.error(data.error || 'Failed to issue code')
      }
    } catch (error) {
      toast.error('Failed to issue code')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevokeCode = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this code?')) return

    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch(`/api/admin/departmental-codes?id=${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        toast.success('Code revoked')
        fetchCodes()
      } else {
        toast.error(data.error || 'Failed to revoke code')
      }
    } catch (error) {
      toast.error('Failed to revoke code')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Code copied to clipboard')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded text-[10px] font-bold">ACTIVE</span>
      case 'USED':
        return <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold">USED</span>
      case 'EXPIRED':
        return <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded text-[10px] font-bold">EXPIRED</span>
      case 'REVOKED':
        return <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold">REVOKED</span>
      default:
        return <span className="bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded text-[10px] font-bold">{status}</span>
    }
  }

  return (
    <div className="p-4 space-y-8 text-white">
      <DepartmentEntryTicketsPanel />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-purple-600 p-2 rounded-lg shadow-lg shadow-purple-900/20">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold uppercase tracking-tight">Departmental Entry Control</h3>
            <p className="text-xs text-slate-500 font-medium">Issue and manage registration authorization keys.</p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={fetchCodes} 
          disabled={isLoading}
          className="text-slate-500 hover:text-white"
        >
          <RefreshCw className={`h-3 w-3 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4">
            <h4 className="text-xs font-black uppercase tracking-widest text-purple-400 mb-4 flex items-center gap-2">
              <Plus className="h-3 w-3" /> Issue Authorization
            </h4>
            <form onSubmit={handleIssueCode} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Department</label>
                <Select 
                  value={newCodeDept} 
                  onValueChange={(val: any) => setNewCodeDept(val)}
                >
                  <SelectTrigger className="bg-slate-900/50 border-slate-700 h-9 text-xs">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="AGENT" className="text-xs">AGENT</SelectItem>
                    <SelectItem value="BRIDGER" className="text-xs">BRIDGER</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Expiry (Days)</label>
                <Input 
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="bg-slate-900/50 border-slate-700 h-9 text-xs"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-purple-600 hover:bg-purple-700 h-10 font-bold uppercase text-[10px] tracking-widest" 
                disabled={isIssuing}
              >
                {isIssuing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Key'}
              </Button>
            </form>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
            <p className="text-[10px] text-slate-400 leading-relaxed italic">
              "Verify identity via Administration Chat before issuing departmental entry keys. Each key is an institutional boundary."
            </p>
            <Link href="/admin/client-messages">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-blue-500/30 bg-blue-500/10 text-blue-300 hover:text-white hover:bg-blue-500/20 text-[10px] font-bold uppercase tracking-widest h-9"
              >
                <MessageCircle className="h-3 w-3 mr-2" />
                View Registration Requests
              </Button>
            </Link>
          </div>
        </div>

        <div className="xl:col-span-2">
          <div className="bg-slate-800/40 border border-slate-700 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-slate-700 bg-slate-800/20">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Registry History</h4>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="bg-slate-900/50">
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-[9px] font-black uppercase py-2">Department</TableHead>
                    <TableHead className="text-[9px] font-black uppercase py-2">Code</TableHead>
                    <TableHead className="text-[9px] font-black uppercase py-2">Status</TableHead>
                    <TableHead className="text-[9px] font-black uppercase py-2">Used By</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase py-2">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto opacity-20" /></TableCell>
                    </TableRow>
                  ) : codes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-slate-500 text-xs italic">No keys issued yet.</TableCell>
                    </TableRow>
                  ) : (
                    codes.map((code) => (
                      <TableRow key={code.id} className="border-slate-800 hover:bg-slate-800/40 transition-colors text-white">
                        <TableCell>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                            code.department === 'AGENT' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'
                          }`}>
                            {code.department}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-[10px] font-bold text-white">
                          <div className="flex items-center gap-1">
                            {code.code}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => copyToClipboard(code.code)}
                              className="h-5 w-5 text-slate-600 hover:text-white"
                            >
                              <Copy className="h-2.5 w-2.5" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(code.status)}
                        </TableCell>
                        <TableCell>
                          {code.used_by_name ? (
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold uppercase">{code.used_by_name}</span>
                              <span className="text-[8px] text-slate-500">{new Date(code.used_at!).toLocaleDateString()}</span>
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-600">Unused</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {code.status === 'ACTIVE' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRevokeCode(code.id)}
                              className="h-6 w-6 text-slate-600 hover:text-red-400"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
