'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
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
  ArrowLeft,
  Send
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

interface ChatSummary {
  client_id: string
  client_name: string
  position: string
  total_messages: number
  unread_count: number
  last_message_at: string
}

interface ChatMessage {
  id: string
  client_id: string
  sender_type: 'client' | 'admin'
  content: string
  created_at: string
}

export default function DepartmentalRegistrationAdmin() {
  const { user } = useAuth()
  const router = useRouter()
  const [codes, setCodes] = useState<DepartmentalCode[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isIssuing, setIsSubmitting] = useState(false)
  const [newCodeDept, setNewCodeDept] = useState<'AGENT' | 'BRIDGER'>('AGENT')
  const [expiresInDays, setExpiresInDays] = useState('7')

  // Chat State
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [selectedChatMessages, setSelectedChatMessages] = useState<ChatMessage[]>([])
  const [replyInput, setReplyInput] = useState('')
  const [isSendingReply, setIsSendingReply] = useState(false)
  const [isLoadingChat, setIsLoadingChat] = useState(false)

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/dashboard')
      return
    }
    fetchCodes()
    fetchChatSummaries()

    const interval = setInterval(fetchChatSummaries, 10000)
    return () => clearInterval(interval)
  }, [user, router])

  useEffect(() => {
    if (selectedClientId) {
      fetchChatMessages(selectedClientId)
      const interval = setInterval(() => fetchChatMessages(selectedClientId, true), 3000)
      return () => clearInterval(interval)
    }
  }, [selectedClientId])

  const fetchChatSummaries = async () => {
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/client/messages?admin=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        // Filter only registration position
        const registrationChats = (data.summary || []).filter((s: any) => s.position === 'registration')
        setChatSummaries(registrationChats)
      }
    } catch (error) {
      console.error('Failed to fetch chat summaries:', error)
    }
  }

  const fetchChatMessages = async (clientId: string, silent = false) => {
    if (!silent) setIsLoadingChat(true)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch(`/api/client/messages?admin=true&clientId=${clientId}&position=registration`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.success) {
        setSelectedChatMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Failed to fetch chat messages:', error)
    } finally {
      if (!silent) setIsLoadingChat(false)
    }
  }

  const handleSendReply = async () => {
    if (!replyInput.trim() || !selectedClientId || isSendingReply) return

    setIsSendingReply(true)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const response = await fetch('/api/client/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          clientId: selectedClientId,
          position: 'registration',
          content: replyInput.trim(),
          senderType: 'admin'
        })
      })
      const data = await response.json()
      if (data.success) {
        setReplyInput('')
        fetchChatMessages(selectedClientId, true)
      }
    } catch (error) {
      toast.error('Failed to send reply')
    } finally {
      setIsSendingReply(false)
    }
  }

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
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <DepartmentEntryTicketsPanel />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 mb-2">
            <Link href="/admin/dashboard" className="hover:text-white transition-colors flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Terminal
            </Link>
            <span>{'/'}</span>
            <span className="text-slate-300">Departmental Registration</span>
          </div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Shield className="h-8 w-8 text-purple-500" />
            Administration Authority
          </h1>
          <p className="text-slate-400 mt-1">Issue and manage departmental registration codes for Agents and Bridgers.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchCodes} 
          disabled={isLoading}
          className="border-slate-700 bg-slate-800/50 text-slate-300 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Issue Code Panel */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 uppercase tracking-tighter">
              <Plus className="h-5 w-5 text-green-500" />
              Issue New Authorization
            </h3>
            
            <form onSubmit={handleIssueCode} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Target Department</label>
                <Select 
                  value={newCodeDept} 
                  onValueChange={(val: any) => setNewCodeDept(val)}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-700 h-12 text-white">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white">
                    <SelectItem value="AGENT">AGENT (Fixed Compensation)</SelectItem>
                    <SelectItem value="BRIDGER">BRIDGER (Performance Share)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Expiration (Days)</label>
                <Input 
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="bg-slate-950 border-slate-700 h-12 text-white"
                  placeholder="e.g. 7"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isIssuing}
                className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 font-black uppercase tracking-widest"
              >
                {isIssuing ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Issue Departmental Code'}
              </Button>
            </form>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-800 bg-slate-800/20 flex items-center justify-between">
              <h4 className="text-blue-400 font-bold flex items-center gap-2 uppercase text-xs tracking-widest">
                <MessageCircle className="h-4 w-4" />
                Registration Requests
              </h4>
              <div className="bg-blue-500/20 text-blue-400 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                {chatSummaries.length}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {chatSummaries.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-xs text-slate-500 italic">No active registration requests.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  {chatSummaries.map((chat) => (
                    <button
                      key={chat.client_id}
                      onClick={() => setSelectedClientId(chat.client_id)}
                      className={`w-full p-4 text-left hover:bg-slate-800/50 transition-colors flex items-center justify-between ${
                        selectedClientId === chat.client_id ? 'bg-blue-500/10 border-l-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{chat.client_name}</div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {new Date(chat.last_message_at).toLocaleString()}
                        </div>
                      </div>
                      {chat.unread_count > 0 && (
                        <div className="bg-blue-500 text-white text-[8px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                          {chat.unread_count}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Registry Table or Selected Chat */}
        <div className="lg:col-span-2">
          {selectedClientId ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl flex flex-col h-[700px]">
              <div className="p-4 border-b border-slate-800 bg-slate-800/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedClientId(null)}
                    className="h-8 w-8 text-slate-400 hover:text-white"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Chat with {chatSummaries.find(s => s.client_id === selectedClientId)?.client_name || 'Visitor'}
                    </h3>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Registration Authority Channel</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchChatMessages(selectedClientId)}
                  className="h-8 border-slate-700 bg-slate-800/50 text-[10px] uppercase font-bold"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingChat ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/30">
                {selectedChatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm ${msg.sender_type === 'admin' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'}`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      <p className={`text-[9px] mt-2 opacity-50 font-medium ${msg.sender_type === 'admin' ? 'text-right' : ''}`}>
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {isLoadingChat && selectedChatMessages.length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-slate-800 bg-slate-900">
                <div className="flex gap-2">
                  <Input
                    value={replyInput}
                    onChange={(e) => setReplyInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                    placeholder="Type your reply..."
                    className="flex-1 bg-slate-950 border-slate-700 text-white h-11"
                    disabled={isSendingReply}
                  />
                  <Button
                    onClick={handleSendReply}
                    disabled={isSendingReply || !replyInput.trim()}
                    className="bg-purple-600 hover:bg-purple-700 h-11 px-6 font-bold uppercase text-xs tracking-widest"
                  >
                    {isSendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl flex flex-col h-full min-h-[600px]">
              <div className="p-6 border-b border-slate-800 bg-slate-800/20 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Departmental Code Registry</h3>
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  Total Issued: {codes.length}
                </div>
              </div>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-950/50">
                  <TableRow className="border-slate-800">
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 py-4">Department</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 py-4">Code</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 py-4">Status</TableHead>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 py-4">Usage</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-4">Control</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-20 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-500 opacity-50" />
                      </TableCell>
                    </TableRow>
                  ) : codes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-20 text-center text-slate-500 italic text-sm">
                        No departmental codes issued yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    codes.map((code) => (
                      <TableRow key={code.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                        <TableCell>
                          <div className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                            code.department === 'AGENT' ? 'bg-blue-500/10 text-blue-400' : 'bg-green-500/10 text-green-400'
                          }`}>
                            {code.department}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs font-mono font-bold text-white bg-slate-950 px-2 py-1 rounded border border-slate-800">
                              {code.code}
                            </code>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => copyToClipboard(code.code)}
                              className="h-7 w-7 text-slate-500 hover:text-white"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(code.status)}
                          {code.expires_at && code.status === 'ACTIVE' && (
                            <div className="text-[8px] text-slate-500 mt-1 flex items-center gap-1">
                              <Clock className="h-2 w-2" />
                              Exp: {new Date(code.expires_at).toLocaleDateString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {code.status === 'USED' ? (
                            <div className="flex flex-col gap-0.5">
                              <div className="text-[10px] font-bold text-slate-300 flex items-center gap-1 uppercase tracking-tighter">
                                <User className="h-2.5 w-2.5" /> {code.used_by_name}
                              </div>
                              <div className="text-[8px] text-slate-500">
                                {new Date(code.used_at!).toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-600 italic">Unused</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {code.status === 'ACTIVE' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleRevokeCode(code.id)}
                              className="h-8 w-8 text-slate-500 hover:text-red-400"
                              title="Revoke Code"
                            >
                              <Trash2 className="h-4 w-4" />
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
        )}
          </div>
      </div>
    </div>
  )
}
