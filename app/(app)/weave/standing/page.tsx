'use client'

import { useEffect, useState } from 'react'
import { FileText, ShieldCheck, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Standing = {
  platformRole: string
  worldRoles: string[]
  crossing: {
    phase: string
    currentPass: number
    fileNumber: string | null
    recognizedAt: string | null
    unlockedRoles: string[]
  }
}

export default function WeaveStandingPage() {
  const { token } = useAuth()
  const [state, setState] = useState<Standing | null>(null)

  useEffect(() => {
    if (!token) return

    fetch('/api/world/state', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((data) => setState(data.success ? data.state : null))
      .catch(() => setState(null))
  }, [token])

  if (!state) {
    return <div className="p-8 text-muted-foreground">Loading your standing…</div>
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <div>
        <p className="text-sm font-medium text-primary">WEAVE OF PRESENCE</p>
        <h1 className="mt-2 text-3xl font-bold">Weave Standing</h1>
        <p className="mt-2 text-muted-foreground">
          Your identity, crossing record, and institutional access.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <CardTitle>File Record</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-mono text-lg">{state.crossing.fileNumber ?? 'Not issued'}</p>
            <p className="text-sm text-muted-foreground">
              Current pass: {state.crossing.currentPass || 'Not started'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Recognition</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">
              {state.crossing.recognizedAt ? 'Recognized resident' : 'Crossing in progress'}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {state.crossing.recognizedAt
                ? new Date(state.crossing.recognizedAt).toLocaleDateString()
                : state.crossing.phase.replaceAll('_', ' ')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>Roles and Access</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {state.worldRoles.map((role) => (
            <span
              key={role}
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm capitalize text-primary"
            >
              {role.replaceAll('_', ' ')}
            </span>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
