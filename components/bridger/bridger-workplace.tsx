'use client'

import {DepartmentBuildings} from '@/components/weave/department-buildings'

/**
 * Hope's Work Desk is the interior of its department buildings, not a second
 * destination menu. BRIDGER_WORKPLACE_SPACES remains the source of every real
 * prospect, communications, social-studio and Client-crossing workstation.
 */
export function BridgerWorkplace({userName:_userName}:{userName?:string|null}){
  return <main data-bridger-workplace="unified-building-host"
    data-bridger-workplace-preserves="existing-routes-and-records"
    data-bridger-daily-job-guide="find-contact-confirm-serve-earn">
    <DepartmentBuildings department="hope"/>
  </main>
}
