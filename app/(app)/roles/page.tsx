'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Star, Users, TrendingUp } from 'lucide-react'

interface BridgerProfile {
  id: string
  commission_rate: number
  status: string
  referrals: number
  total_earnings: number
}

interface AgentProfile {
  id: string
  agent_type: string
  commission_rate: number
  status: string
  matches_completed: number
  total_earnings: number
  rating: number
}

export default function RolesPage() {
  const [bridger, setBridger] = useState<BridgerProfile | null>(null)
  const [agent, setAgent] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const [bridgerRes, agentRes] = await Promise.all([
          fetch('/api/roles/bridger'),
          fetch('/api/roles/agent')
        ])

        if (bridgerRes.ok) {
          const bridgerData = await bridgerRes.json()
          setBridger(bridgerData.data)
        }

        if (agentRes.ok) {
          const agentData = await agentRes.json()
          setAgent(agentData.data)
        }
      } catch (error) {
        console.error('[v0] Error fetching roles:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRoles()
  }, [])

  if (loading) {
    return <div className="p-8 text-center">Loading roles...</div>
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Roles & Profiles</h1>
        <p className="text-muted-foreground mt-2">Manage your Bridger and Agent profiles</p>
      </div>

      <Tabs defaultValue="bridger" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bridger">Bridger Profile</TabsTrigger>
          <TabsTrigger value="agent">Agent Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="bridger" className="space-y-4">
          {bridger ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(bridger.commission_rate * 100).toFixed(1)}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Referrals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bridger.referrals}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Total Earnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{bridger.total_earnings.toFixed(2)} TRX</div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Bridger Status</CardTitle>
              <CardDescription>Your current role status and activity</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge variant="outline">{bridger?.status}</Badge>
              </div>
              <Button className="w-full">Manage Bridger Profile</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agent" className="space-y-4">
          {agent ? (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Commission Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(agent.commission_rate * 100).toFixed(1)}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Matches</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{agent.matches_completed}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Rating
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{agent.rating.toFixed(1)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{agent.total_earnings.toFixed(2)} TRX</div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Agent Status</CardTitle>
              <CardDescription>Your agent profile and performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Type</span>
                <Badge variant="outline">{agent?.agent_type}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge variant="outline">{agent?.status}</Badge>
              </div>
              <Button className="w-full">Manage Agent Profile</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
