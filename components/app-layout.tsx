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
    <div className="min-h-screen">
      <AppHeader user={user} />
      <main className="min-h-screen pt-16">{children}</main>
    </div>
  )
}
