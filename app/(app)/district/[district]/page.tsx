'use client'

import { useParams } from 'next/navigation'
import { RoleDistrictEnvironment } from '@/components/world/role-district-environment'

export default function RoleDistrictPage(){
  const params=useParams<{district:string}>()
  const key=Array.isArray(params.district)?params.district[0]:params.district
  return <RoleDistrictEnvironment districtKey={key}/>
}
