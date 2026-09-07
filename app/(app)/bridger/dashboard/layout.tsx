import { DailyProspect } from '@/components/bridger/daily-prospect'
import BridgerSupportSidebar from '@/components/bridger-support-sidebar'
import { BridgerSupportAd } from '@/components/bridger-company-support'

export default function BridgerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DailyProspect />
      <BridgerSupportSidebar />
      <BridgerSupportAd />
      {children}
    </>
  )
}
