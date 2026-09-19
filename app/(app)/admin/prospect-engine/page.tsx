'use client'
import { getAuthHeaders } from '@/lib/auth-client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Loader2, Zap, Users, Package, PhoneCall, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

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
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center gap-4">
        <div className="bg-orange-600 p-3 rounded-xl shadow-lg shadow-orange-900/20">
          <Zap className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Prospect Engine</h1>
          <p className="text-slate-400 font-medium">WEAVE Ecosystem · Prospect Discovery Authority</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-8">
          {/* Number Series Generator */}
          <Card className="border-slate-700 bg-slate-900/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <PhoneCall className="h-5 w-5 text-orange-400" />
                Number Series Engine
              </CardTitle>
              <CardDescription className="text-xs">Generate prospects from a source number series.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Source Number</label>
                  <Input 
                    value={sourceNumber}
                    onChange={(e) => setSourceNumber(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-white font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Count to Generate</label>
                  <Input 
                    type="number"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-orange-600 hover:bg-orange-700 font-bold uppercase tracking-tighter"
                  disabled={isGenerating}
                >
                  {isGenerating ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  Run Reachability Agent
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Statistics */}
          <Card className="border-slate-700 bg-slate-900/50 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-400" />
                Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                <span className="text-xs text-slate-400 font-bold uppercase">Available Prospects</span>
                <span className="text-xl font-black text-white">{availableContacts.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg border border-blue-500/20">
                <span className="text-xs text-blue-400 font-bold uppercase">Selected for Package</span>
                <span className="text-xl font-black text-blue-400">{selectedContacts.length}</span>
              </div>
              <Button 
                onClick={handlePackage}
                disabled={selectedContacts.length === 0 || isPackaging}
                className="w-full bg-blue-600 hover:bg-blue-700 font-bold uppercase tracking-tighter"
              >
                {isPackaging ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Package className="h-4 w-4 mr-2" />}
                Create Prospect Package
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Available Prospects Table */}
        <Card className="lg:col-span-2 border-slate-700 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Qualified Prospect Pool</CardTitle>
              <CardDescription className="text-xs">Numbers verified by Reachability Agent.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAvailable} className="border-slate-700 text-slate-400">
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
                      <TableHead className="w-12"></TableHead>
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Phone Number</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Source</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Verified At</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableContacts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-20 text-slate-500 text-xs">
                          No available prospects. Generate some above.
                        </TableCell>
                      </TableRow>
                    ) : (
                      availableContacts.map((c) => (
                        <TableRow 
                          key={c.id} 
                          className={`border-slate-800 hover:bg-slate-800/30 transition-colors cursor-pointer ${selectedContacts.includes(c.id) ? 'bg-blue-500/10' : ''}`}
                          onClick={() => toggleContact(c.id)}
                        >
                          <TableCell>
                            <div className={`w-4 h-4 rounded border border-slate-600 flex items-center justify-center ${selectedContacts.includes(c.id) ? 'bg-blue-500 border-blue-500' : ''}`}>
                              {selectedContacts.includes(c.id) && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-white">{c.phone || c.whatsapp_number}</TableCell>
                          <TableCell className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Engine</TableCell>
                          <TableCell className="text-[10px] text-slate-500 font-mono">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[8px] uppercase border-green-500/20 text-green-500 bg-green-500/5">
                              Qualified
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
