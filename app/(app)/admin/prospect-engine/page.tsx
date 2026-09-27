'use client'
import { getAuthHeaders } from '@/lib/auth-client'

import { useState, useEffect } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Loader2, Zap, Users, Package, PhoneCall, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { WeaveSystemRoom } from '@/components/world/weave-system-room'

interface Contact {
  id: string
  phone: string
  status: string
  created_at: string
}

export default function ProspectEnginePage() {
  const [sourceNumber, setSourceNumber] = useState('08012345000')
  const [count, setCount] = useState('50')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPackaging, setIsPackaging] = useState(false)
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchAvailable()
  }, [])

  const fetchAvailable = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/market/prospects/list-available', { headers: getAuthHeaders() })
      const data = await res.json()
      if (data.success) {
        setAvailableContacts(data.contacts)
      }
    } catch (error) {
      toast.error('Failed to load contacts')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsGenerating(true)
    try {
      const res = await fetch('/api/admin/market/prospects/generate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sourceNumber, count })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Generated series: ${data.contactsGenerated} qualified prospects found.`)
        fetchAvailable()
      } else {
        toast.error(data.error || 'Generation failed')
      }
    } catch (error) {
      toast.error('Network error during generation')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePackage = async () => {
    if (selectedContacts.length === 0) {
      toast.error('Select prospects to package')
      return
    }
    setIsPackaging(true)
    try {
      const res = await fetch('/api/admin/market/prospects/package', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ contactIds: selectedContacts })
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Package created: ${data.package.title}`)
        setSelectedContacts([])
        fetchAvailable()
      } else {
        toast.error(data.error || 'Failed to create package')
      }
    } catch (error) {
      toast.error('Failed to create package')
    } finally {
      setIsPackaging(false)
    }
  }

  const toggleContact = (id: string) => {
    setSelectedContacts(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  return (
    <WeaveSystemRoom
      roomKey="administration-prospect-engine"
      eyebrow="Administration · Prospect Engine"
      title="Prospect discovery authority"
      detail="Generate, qualify and package Prospect movement inside one Administration system. The number engine, inventory and qualified pool remain visible together."
      tone="amber"
      pulse={isGenerating?'Reachability Agent running':isPackaging?'Packaging selected prospects':'Prospect Engine ready'}
      left={
        <div className="space-y-6">
          <section className="border-l border-orange-300/25 pl-4">
            <div className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-orange-300"/>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-orange-300">Number series</p>
            </div>
            <form onSubmit={handleGenerate} className="mt-4 space-y-4">
              <label className="block space-y-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Source number</span>
                <Input value={sourceNumber} onChange={(e) => setSourceNumber(e.target.value)} className="border-white/10 bg-black/20 font-mono text-white"/>
              </label>
              <label className="block space-y-2">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Count</span>
                <Input type="number" value={count} onChange={(e) => setCount(e.target.value)} className="border-white/10 bg-black/20 text-white"/>
              </label>
              <Button type="submit" className="w-full bg-orange-600 font-black uppercase" disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Zap className="mr-2 h-4 w-4"/>}
                Run agent
              </Button>
            </form>
          </section>

          <section className="border-l border-blue-300/20 pl-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-300"/>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-300">Inventory</p>
            </div>
            <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
              <div className="flex items-center justify-between py-3">
                <span className="text-[10px] font-bold uppercase text-slate-500">Available</span>
                <span className="text-lg font-black text-white">{availableContacts.length}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-[10px] font-bold uppercase text-blue-300">Selected</span>
                <span className="text-lg font-black text-blue-300">{selectedContacts.length}</span>
              </div>
            </div>
            <Button onClick={handlePackage} disabled={selectedContacts.length===0||isPackaging} className="mt-4 w-full bg-blue-600 font-black uppercase">
              {isPackaging ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Package className="mr-2 h-4 w-4"/>}
              Create package
            </Button>
          </section>
        </div>
      }
      center={
        <section data-prospect-pool>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-300">Qualified Prospect Pool</p>
              <h2 className="mt-1 text-xl font-black text-white">Reachability-confirmed inventory</h2>
              <p className="mt-1 text-[10px] text-slate-500">Select rows to form a Prospect package.</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAvailable} className="border-white/10 text-slate-300">Refresh</Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-slate-700"/></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-white/[0.02]">
                  <TableRow className="border-white/10">
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">Phone</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">Source</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">Verified</TableHead>
                    <TableHead className="text-[9px] font-black uppercase tracking-widest text-slate-500">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availableContacts.length===0 ? (
                    <TableRow><TableCell colSpan={5} className="py-20 text-center text-xs text-slate-500">No available Prospects. Run the number series agent.</TableCell></TableRow>
                  ) : availableContacts.map((contact)=>(
                    <TableRow
                      key={contact.id}
                      className={`cursor-pointer border-white/[0.07] transition hover:bg-amber-300/[0.025] ${selectedContacts.includes(contact.id)?'bg-blue-500/[0.06]':''}`}
                      onClick={()=>toggleContact(contact.id)}
                    >
                      <TableCell>
                        <div className={`flex h-4 w-4 items-center justify-center border border-slate-600 ${selectedContacts.includes(contact.id)?'border-blue-500 bg-blue-500':''}`}>
                          {selectedContacts.includes(contact.id)&&<CheckCircle2 className="h-3 w-3 text-white"/>}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-white">{contact.phone || (contact as any).whatsapp_number}</TableCell>
                      <TableCell className="text-[9px] font-black uppercase tracking-wider text-slate-500">Engine</TableCell>
                      <TableCell className="font-mono text-[9px] text-slate-500">{new Date(contact.created_at).toLocaleDateString()}</TableCell>
                      <TableCell><Badge variant="outline" className="border-green-500/20 bg-green-500/5 text-[8px] uppercase text-green-500">Qualified</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      }
      right={
        <section className="border-l border-emerald-300/20 pl-4">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-300">Movement</p>
          <div className="mt-3 space-y-2 text-[10px] leading-5 text-slate-400">
            <p>Generate from a source series.</p>
            <p>Reachability qualifies contacts.</p>
            <p>Select real Prospect records.</p>
            <p>Package only the selected movement.</p>
          </div>
        </section>
      }
    />
  )
}
