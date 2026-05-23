"use client"

import { AppSidebar } from "@/components/app-sidebar"
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
    <div className="flex min-h-screen">
      <AppSidebar user={user} />
      <div className="flex flex-1 flex-col pl-64">
        <AppHeader user={user} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
