"use client"

import { AppHeader } from "@/components/app-header"

interface AppLayoutProps {
  children: React.ReactNode
  user?: {
    name: string
    role: string
    avatar?: string
  }
}

export function AppLayout({ children, user }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader user={user} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
