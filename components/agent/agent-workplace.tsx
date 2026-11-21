'use client'

import {DepartmentBuildings} from '@/components/weave/department-buildings'

/**
 * Stability's existing Work Desk now hosts the department's building entrance.
 * All stations remain in AGENT_SPACES, indexed by the shared company directory.
 * No stock, distribution, commission or account operations are copied here.
 */
export function AgentWorkplace({userName:_userName}:{userName?:string|null}){
  return <main data-agent-workplace="unified-building-host"
    data-agent-daily-job-guide="learn-order-supply-settle">
    <DepartmentBuildings department="stability"/>
  </main>
}
