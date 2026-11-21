'use client'

import {DepartmentBuildings} from '@/components/weave/department-buildings'

/**
 * Administrations' Command Desk is now the company buildings and their
 * established operating interiors. ADMIN_SPACES remains the definitive list
 * of existing workstations; no approval or release authority moves here.
 */
export function AdminWorkplace({userName:_userName}:{userName?:string|null}){
  return <main data-admin-workplace="unified-building-host">
    <DepartmentBuildings department="administrations"/>
  </main>
}
