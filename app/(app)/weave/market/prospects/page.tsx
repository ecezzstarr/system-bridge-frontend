'use client'
import { getAuthHeaders } from '@/lib/auth-client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Package, ShoppingCart, CheckCircle2, AlertCircle, Wallet, Send, MessageCircle, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth-provider'

interface ProspectPackage {
  id: string
  title: string
  description: string
  price_trx: string
  created_at: string
}

interface MyProspect {
  outreachId: string
  status: 'pending' | 'sent' | 'responded' | 'opened' | 'converted' | 'invalid_number'
  messageSent: string
  sentAt: string | null
  lastActivityAt: string
  name: string
  prospectWhatsapp: string
  phone: string
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: 'Not Sent Yet', color: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  sent: { label: 'Message Sent', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  opened: { label: 'Opened Link', color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  responded: { label: 'In System Switch', color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' },
  converted: { label: 'Converted — Client', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  invalid_number: { label: 'Not on WhatsApp', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

export default function ProspectMarketPage() {
  const { user, updateBalance } = useAuth()
  const [tab, setTab] = useState<'browse' | 'mine'>('browse')

  // Browse tab state
  const [packages, setPackages] = useState<ProspectPackage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [purchasingId, setPurchasingId] = useState<string | null>(null)

  // My Prospects tab state
  const [myProspects, setMyProspects] = useState<MyProspect[]>([])
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [numberInput, setNumberInput] = useState('')
  const [mineLoading, setMineLoading] = useState(true)
  const [savingNumber, setSavingNumber] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [reportingId, setReportingId] = useState<string | null>(null)

  useEffect(() => {
    fetchPackages()
  }, [])

  useEffect(() => {
    if (tab === 'mine') fetchMine()
  }, [tab])

  const fetchPackages = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/market/prospects', { headers: getAuthHeaders() })
      const data = await res.json()
      if (data.success) setPackages(data.packages)
    } catch (error) {
      toast.error('Failed to load marketplace')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMine = async () => {
    setMineLoading(true)
    try {
      const res = await fetch('/api/bridger/prospects', { headers: getAuthHeaders() })
      const data = await res.json()
      if (data.success) {
        setMyProspects(data.prospects)
        setWhatsappNumber(data.whatsappNumber || '')
        setNumberInput(data.whatsappNumber || '')
      }
    } catch (error) {
      toast.error('Failed to load your prospects')
    } finally {
      setMineLoading(false)
    }
  }

  const handlePurchase = async (packageId: string) => {
    setPurchasingId(packageId)
    try {
      const res = await fetch('/api/market/prospects/purchase', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ packageId })
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Package purchased! Check "My Prospects" to send your first message.'); if (typeof data.newBalance === 'number') updateBalance(data.newBalance)
        fetchPackages()
      } else {
        toast.error(data.error || 'Purchase failed')
      }
    } catch (error) {
      toast.error('Network error during purchase')
    } finally {
      setPurchasingId(null)
    }
  }

  const handleSaveNumber = async () => {
    if (!numberInput.trim()) return
    setSavingNumber(true)
    try {
      const res = await fetch('/api/bridger/prospects', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ whatsappNumber: numberInput.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setWhatsappNumber(data.whatsappNumber)
        toast.success('WhatsApp number saved')
      }
    } catch (error) {
      toast.error('Failed to save number')
    } finally {
      setSavingNumber(false)
    }
  }

  const handleReportInvalid = async (p: MyProspect) => {
    setReportingId(p.outreachId)
    try {
      const res = await fetch(`/api/bridger/prospects/${p.outreachId}/report-invalid`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || 'Reported. Replacements added.')
        fetchMine()
      } else {
        toast.error(data.error || 'Failed to report prospect')
      }
    } catch (error) {
      toast.error('Failed to report')
    } finally {
      setReportingId(null)
    }
  }

  const handleSend = async (p: MyProspect) => {
    if (!whatsappNumber) {
      toast.error('Add your WhatsApp number first')
      return
    }
    setSendingId(p.outreachId)
    try {
      const target = (p.prospectWhatsapp || p.phone || '').replace(/[^\d+]/g, '')
      const waUrl = `https://wa.me/${target.replace('+', '')}?text=${encodeURIComponent(p.messageSent)}`
      window.open(waUrl, '_blank')

      const res = await fetch(`/api/bridger/prospects/${p.outreachId}/send`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Marked as sent')
        fetchMine()
      } else {
        toast.error(data.error || 'Failed to mark as sent')
      }
    } catch (error) {
      toast.error('Failed to send')
    } finally {
      setSendingId(null)
    }
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/20">
            <ShoppingCart className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Prospect Marketplace</h1>
            <p className="text-slate-400 font-medium">Acquire qualified leads for your Bridge AI.</p>
          </div>
        </div>

        <Card className="bg-slate-900/50 border-slate-700 backdrop-blur-xl shrink-0">
          <CardContent className="p-4 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-[#e8b93f]" />
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Your Balance</p>
              <p className="text-lg font-black text-white">{user?.platform_wallet_balance?.toFixed(2) || '0.00'} <span className="text-[#e8b93f] text-xs">Flame Coin</span></p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2 border-b border-slate-800">
        <button
          onClick={() => setTab('browse')}
          className={`px-4 py-2 text-sm font-bold uppercase tracking-tight ${tab === 'browse' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`}
        >
          Browse Packages
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`px-4 py-2 text-sm font-bold uppercase tracking-tight flex items-center gap-1 ${tab === 'mine' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`}
        >
          <Users className="h-3 w-3" /> My Prospects
        </button>
      </div>

      {tab === 'browse' ? (
        <>
          {isLoading ? (
            <div className="flex justify-center py-40">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 opacity-20" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.length === 0 ? (
                <div className="col-span-full py-40 text-center space-y-4">
                  <Package className="h-16 w-16 text-slate-800 mx-auto" />
                  <p className="text-slate-500 font-medium italic">No prospect packages available at the moment.</p>
                </div>
              ) : (
                packages.map((pkg) => (
                  <Card key={pkg.id} className="border-slate-700 bg-slate-900/50 backdrop-blur-xl flex flex-col hover:border-blue-500/50 transition-colors">
                    <CardHeader>
                      <div className="flex justify-between items-start mb-2">
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 uppercase text-[9px] font-black">Available</Badge>
                        <span className="text-[10px] text-slate-500 font-mono">{new Date(pkg.created_at).toLocaleDateString()}</span>
                      </div>
                      <CardTitle className="text-xl font-black text-white italic">{pkg.title}</CardTitle>
                      <CardDescription className="text-slate-400 text-xs line-clamp-2">{pkg.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-4">
                      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Verified WhatsApp Numbers</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Pre-qualified Interest</span>
                        </div>
                      </div>

                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">{pkg.price_trx}</span>
                        <span className="text-xs font-black text-[#e8b93f] uppercase tracking-widest">Flame Coin</span>
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0">
                      <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-tighter"
                        disabled={purchasingId === pkg.id}
                        onClick={() => handlePurchase(pkg.id)}
                      >
                        {purchasingId === pkg.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <ShoppingCart className="h-4 w-4 mr-2" />
                        )}
                        Purchase Package
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}
            </div>
          )}

          <div className="bg-blue-900/10 border border-blue-900/20 rounded-2xl p-6 flex gap-4 items-start">
            <AlertCircle className="h-6 w-6 text-blue-400 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-blue-400 uppercase tracking-tight">Purchase Agreement</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                By purchasing a prospect package, you agree to the Weave Outreach Mandate. Outreach must be initiated through the system-approved Bridge AI link. Misuse of prospect contact information may result in Bridger status suspension.
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <Card className="border-slate-700 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-sm">Your WhatsApp Number</CardTitle>
              <CardDescription className="text-xs">Used to send your first message to each purchased prospect.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Input
                value={numberInput}
                onChange={(e) => setNumberInput(e.target.value)}
                placeholder="+1 555 000 0000"
                className="bg-slate-800 border-slate-700 text-white"
              />
              <Button onClick={handleSaveNumber} disabled={savingNumber || !numberInput.trim()} className="bg-blue-600 hover:bg-blue-700">
                {savingNumber ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </CardContent>
          </Card>

          {mineLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-700" /></div>
          ) : myProspects.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-sm">
              No prospects purchased yet. Browse packages above.
            </div>
          ) : (
            <div className="space-y-3">
              {myProspects.map((p) => {
                const st = STATUS_LABEL[p.status] || STATUS_LABEL.pending
                return (
                  <Card key={p.outreachId} className="bg-slate-900/50 border-slate-700">
                    <CardContent className="flex items-center justify-between py-4">
                      <div>
                        <p className="text-white font-medium">{p.name}</p>
                        <p className="text-xs text-slate-500">{p.prospectWhatsapp || p.phone}</p>
                        <Badge variant="outline" className={`mt-1 text-[10px] ${st.color}`}>{st.label}</Badge>
                      </div>
                      {p.status === 'pending' ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={sendingId === p.outreachId || !whatsappNumber}
                            onClick={() => handleSend(p)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {sendingId === p.outreachId ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
                            Send First Message
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reportingId === p.outreachId}
                            onClick={() => handleReportInvalid(p)}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          >
                            {reportingId === p.outreachId ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Not on WhatsApp?'}
                          </Button>
                        </div>
                      ) : p.status === 'converted' ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      ) : (
                        <MessageCircle className="h-5 w-5 text-slate-500" />
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
