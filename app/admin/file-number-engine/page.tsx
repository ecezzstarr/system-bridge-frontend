'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
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
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Copy, CheckCircle2, UserPlus, FileBox } from 'lucide-react'
import { toast } from 'sonner'

interface Bridger {
  id: string
  name: string
  email: string
}

interface FileFolder {
  id: string
  file_number: string
  status: string
  bridger_id: string
  bridger_name: string
  identity_data: {
    name: string
    phone: string
  }
  created_at: string
  registered_at: string | null
}

export default function FileNumberEnginePage() {
  const { user } = useAuth()
  const router = useRouter()
  
  const [bridgers, setBridgers] = useState<Bridger[]>([])
  const [folders, setFolders] = useState<FileFolder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    bridgerId: '',
    name: '',
    phone: ''
  })

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      // Allow for development access if role isn't perfectly set
      // router.push('/login')
      // return
    }

    fetchData()
  }, [user, router])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [bridgersRes, foldersRes] = await Promise.all([
        fetch('/api/users'), // Updated to match system-bridge-frontend API
        fetch('/api/admin/fne/list')
      ])
      
      const bridgersData = await bridgersRes.json()
      const foldersData = await foldersRes.json()
      
      // Filter for users who can act as bridgers
      const users = Array.isArray(bridgersData) ? bridgersData : bridgersData.users || []
      setBridgers(users.filter((u: any) => u.role === 'bridger' || u.role === 'agent' || u.role === 'admin'))
      setFolders(foldersData.folders || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.bridgerId || !formData.name || !formData.phone) {
      toast.error('Please fill all fields')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/admin/fne/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const result = await res.json()
      if (result.success) {
        toast.success(`Generated: ${result.fileFolder.file_number}`)
        setFormData({ bridgerId: '', name: '', phone: '' })
        fetchData()
      } else {
        toast.error(result.error || 'Generation failed')
      }
    } catch (error) {
      toast.error('Failed to generate file number')
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center gap-4">
        <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-900/20">
          <FileBox className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-white uppercase">File Number Engine</h1>
          <p className="text-slate-400 font-medium">WEAVE Ecosystem · Client Identity Authority</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Generation Form */}
        <Card className="lg:col-span-1 border-slate-700 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-400" />
              Issue New File Folder
            </CardTitle>
            <CardDescription className="text-xs">Issue a collision-safe random File Number for a new Client. Numbers are not sequential and do not reveal issuance order.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select Bridger</label>
                <Select 
                  value={formData.bridgerId} 
                  onValueChange={(val) => setFormData({...formData, bridgerId: val})}
                >
                  <SelectTrigger className="bg-slate-800/50 border-slate-700 text-sm">
                    <SelectValue placeholder="Select a bridger" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    {bridgers.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Client Name</label>
                <Input 
                  placeholder="Full Name" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Client Phone / WhatsApp</label>
                <Input 
                  placeholder="+123..." 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="bg-slate-800/50 border-slate-700 text-white"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 font-bold uppercase tracking-tighter" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate File Number
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* List of Folders */}
        <Card className="lg:col-span-2 border-slate-700 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" />
              Active File Folders
            </CardTitle>
            <CardDescription className="text-xs">Track issued Client File Numbers and their registration status.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500 opacity-20" />
              </div>
            ) : (
              <div className="rounded-md border border-slate-800">
                <Table>
                  <TableHeader className="bg-slate-800/50">
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">File Number</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Client Details</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Issued By</TableHead>
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</TableHead>
                      <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {folders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-20 text-slate-500 text-sm font-medium">
                          No file folders generated yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      folders.map((folder) => (
                        <TableRow key={folder.id} className="border-slate-800 hover:bg-slate-800/30 transition-colors">
                          <TableCell className="font-mono text-[11px] font-bold text-blue-400">
                            {folder.file_number}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-white uppercase">{folder.identity_data.name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{folder.identity_data.phone}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-300 font-medium italic">
                            {folder.bridger_name || 'System'}
                          </TableCell>
                          <TableCell>
                            {folder.status === 'pending' ? (
                              <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                                Pending
                              </div>
                            ) : (
                              <div className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-green-500/10 text-green-500 border border-green-500/20">
                                Registered
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => copyToClipboard(folder.file_number)}
                              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
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
