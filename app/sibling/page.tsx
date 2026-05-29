'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, DollarSign, Calendar, FileText, TrendingUp, Wallet } from 'lucide-react'

export default function SiblingDashboard() {
  const { user } = useAuth()
  const [agreements, setAgreements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAgreements = async () => {
      try {
        const res = await fetch('/api/admin/siblings')
        const data = await res.json()
        if (data.success) {
          const myAgreements = user?.role === 'admin' 
            ? data.data 
            : data.data.filter((a: any) => a.sibling_id === user?.id)
          setAgreements(myAgreements)
        }
      } catch (error) {
        console.error('Error fetching agreements:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) fetchAgreements()
  }, [user])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    )
  }

  const activeAgreements = agreements.filter(a => a.status === 'active')
  const totalCapital = activeAgreements.reduce((sum, a) => sum + parseFloat(a.capital_amount), 0)
  const totalMonthlyReturn = activeAgreements.reduce((sum, a) => sum + parseFloat(a.monthly_return_amount), 0)

  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-950 min-h-screen text-slate-200">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">Sibling Dashboard</h1>
        <p className="text-slate-400">Welcome back, {user?.name}. Here is your partnership overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Capital</CardTitle>
            <Wallet className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalCapital.toLocaleString()} TRX</div>
            <p className="text-xs text-slate-500 mt-1">Across {activeAgreements.length} active agreements</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Monthly Returns</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">{totalMonthlyReturn.toLocaleString()} TRX</div>
            <p className="text-xs text-slate-500 mt-1">Expected this month</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active Contracts</CardTitle>
            <FileText className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{activeAgreements.length}</div>
            <p className="text-xs text-slate-500 mt-1">Currently operational</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Active Agreements</h2>
        <div className="grid grid-cols-1 gap-4">
          {activeAgreements.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No active agreements found.</p>
          ) : (
            activeAgreements.map((ag) => (
              <Card key={ag.id} className="bg-slate-900 border-slate-800 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-purple-500 to-blue-500" />
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white">{ag.title}</CardTitle>
                      <CardDescription className="text-slate-400">{ag.business_description}</CardDescription>
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-500">ACTIVE</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Capital Amount</p>
                      <p className="text-lg font-bold text-white">{parseFloat(ag.capital_amount).toLocaleString()} TRX</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Monthly Return</p>
                      <p className="text-lg font-bold text-emerald-400">{ag.monthly_return_percent}%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Monthly Amount</p>
                      <p className="text-lg font-bold text-white">{parseFloat(ag.monthly_return_amount).toLocaleString()} TRX</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Duration</p>
                      <p className="text-lg font-bold text-white">{ag.duration_months} Months</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-800 flex items-center gap-6 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Started: {new Date(ag.created_at).toLocaleDateString()}
                    </div>
                    {ag.capital_return_date && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        Maturity: {new Date(ag.capital_return_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
      
      {agreements.some(a => a.status !== 'active') && (
        <div className="space-y-4 pt-8">
          <h2 className="text-xl font-bold text-slate-400">History</h2>
          <div className="grid grid-cols-1 gap-4 opacity-60">
            {agreements.filter(a => a.status !== 'active').map((ag) => (
              <Card key={ag.id} className="bg-slate-900 border-slate-800">
                <CardHeader className="py-4">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-sm text-slate-300">{ag.title}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{ag.status.toUpperCase()}</Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
