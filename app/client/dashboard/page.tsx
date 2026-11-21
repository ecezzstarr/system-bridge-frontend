'use client'

import {useAuth} from '@/lib/auth-provider'
import {DepartmentBuildings} from '@/components/weave/department-buildings'
import {LifestyleEntry} from '@/components/manager-lifestyle-entry'
import CompanyStaffWorkspaceEntry from '@/components/client/company-staff-workspace-entry'
import ProFolderUpgradeReminder from '@/components/client/pro-folder-upgrade-reminder'
import ClientSiblingsEventCard from '@/components/client/client-siblings-event-card'

export default function ClientDashboardPage(){
 const {user}=useAuth()
 if(user?.role!=='client')return null
 return <>
  <DepartmentBuildings department="dream-lovely"/>
  <details className="mx-auto my-4 w-full max-w-5xl rounded-xl border border-amber-100/25 bg-[#132b35] p-3 text-white"
    data-client-account-notices="preserved">
   <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">My business appointments and account notices</summary>
   <LifestyleEntry/>
   <ProFolderUpgradeReminder/>
   <ClientSiblingsEventCard/>
   <CompanyStaffWorkspaceEntry/>
  </details>
 </>
}
