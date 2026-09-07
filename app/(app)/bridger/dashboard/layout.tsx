import { DailyProjectClaim } from '@/components/bridger/daily-project-claim'

export default function BridgerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DailyProjectClaim />
      {children}
    </>
  )
}
