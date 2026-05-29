'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Users, DollarSign, Calendar, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function SiblingsWorkshop() {
  const [agreements, setAgreements] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  
  const [formData, setFormData] = useState({
    sibling_id: '',
    title: '',
    business_description: '',
    capital_amount: 0,
    monthly_return_percent: 10,
    duration_months: 12
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [agrRes, userRes] = await Promise.all([
        fetch('/api/admin/siblings'),
        fetch('/api/admin/users')
      ])
      
      const agrData = await agrRes.json()
      const userData = await userRes.json()
      
      if (agrData.success) setAgreements(agrData.data)
      if (userData.success) setUsers(userData.users.filter((u: any) => u.role === 'sibling' || u.role === 'user'))
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/siblings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setIsCreating(false)
        fetchData()
      }
    } catch (error) {
      console.error('Error creating agreement:', error)
    }
  }

  const handleAction = async (id: string, action: 'close' | 'return-capital') => {
    try {
      const res = await fetch(`/api/admin/siblings//`, { method: 'POST' })
      if (res.ok) fetchData()
    } catch (error) {
      console.error(`Error performing :`, error)
    }
  }

  return (
    <div className="p-8 space-y-6 bg-slate-950 min-h-screen text-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/workshop">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white">Sibling Partnerships</h1>
        </div>
        <Button onClick={() => setIsCreating(true)} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" /> New Agreement
        </Button>
      </div>

      {isCreating && (
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Create New Partnership</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sibling</label>
                <select 
                  className="w-full bg-slate-800 border-slate-700 rounded-md p-2 text-white"
                  value={formData.sibling_id}
                  onChange={e => setFormData({...formData, sibling_id: e.target.value})}
                  required
                >
                  <option value="">Select a user</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input 
                  className="bg-slate-800 border-slate-700 text-white" 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Business Description</label>
                <textarea 
                  className="w-full bg-slate-800 border-slate-700 rounded-md p-2 text-white h-24"
                  value={formData.business_description}
                  onChange={e => setFormData({...formData, business_description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Capital Amount (TRX)</label>
                <Input 
                  type="number"
                  className="bg-slate-800 border-slate-700 text-white" 
                  value={formData.capital_amount}
                  onChange={e => setFormData({...formData, capital_amount: parseFloat(e.target.value)})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Monthly Return (%)</label>
                <Input 
                  type="number"
                  className="bg-slate-800 border-slate-700 text-white" 
                  value={formData.monthly_return_percent}
                  onChange={e => setFormData({...formData, monthly_return_percent: parseFloat(e.target.value)})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (Months)</label>
                <Input 
                  type="number"
                  className="bg-slate-800 border-slate-700 text-white" 
                  value={formData.duration_months}
                  onChange={e => setFormData({...formData, duration_months: parseInt(e.target.value)})}
                  required
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">Create Agreement</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {agreements.length === 0 ? (
            <p className="text-center py-12 text-slate-500">No active sibling partnerships found.</p>
          ) : (
            agreements.map((ag) => (
              <Card key={ag.id} className="bg-slate-900 border-slate-800">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white">{ag.title}</CardTitle>
                      <CardDescription className="text-slate-400">Sibling: {ag.sibling_username}</CardDescription>
                    </div>
                    <Badge className={
                      ag.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' :
                      ag.status === 'capital_returned' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-slate-500/10 text-slate-500'
                    }>
                      {ag.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Capital</p>
                      <p className="font-bold text-white">{parseFloat(ag.capital_amount).toLocaleString()} TRX</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Monthly Return</p>
                      <p className="font-bold text-emerald-400">{ag.monthly_return_percent}% ({parseFloat(ag.monthly_return_amount).toLocaleString()} TRX)</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Duration</p>
                      <p className="font-bold text-white">{ag.duration_months} Months</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Started</p>
                      <p className="font-bold text-white">{new Date(ag.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  {ag.status === 'active' && (
                    <div className="flex justify-end gap-2 mt-6">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-slate-700 hover:bg-slate-800"
                        onClick={() => handleAction(ag.id, 'close')}
                      >
                        Close
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => handleAction(ag.id, 'return-capital')}
                      >
                        Return Capital
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
