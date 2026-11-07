/**
 * Pro Regional Manager is an Administration-appointed position, distinct from
 * the ordinary Bridger/Agent Regional Manager Lifestyle role.
 *
 * All Pro Regional Managers require approved employment terms, a verified
 * business plan and operating address, a personally owned Pro File Folder
 * entitlement, and independent verification of the activation payment.
 * No role, File Number, salary or folder is granted by this policy alone.
 *
 * Current activation records and private File Folder APIs are Client-scoped.
 * Bridger and Agent Pro onboarding MUST NOT be treated as functional until
 * their authenticated ownership and activation paths are implemented.
 */
export type ProRegionalManagerSourceRole='bridger'|'agent'|'client'
export const PRO_REGIONAL_MANAGER_POSITION='pro_regional_manager' as const
export const PRO_REGIONAL_MANAGER_SOURCE_ROLES=
  ['bridger','agent','client'] as const
export const PRO_REGIONAL_MANAGER_DEPARTMENTS={
  bridger:{department:'Hope',workScope:'bridger_business_bridge',
    title:'Pro Regional Manager · Hope',dailyWork:'Approved Bridger outreach, partnerships and regional prospect movement'},
  agent:{department:'Stability',workScope:'agent_business_stability',
    title:'Pro Regional Manager · Stability',dailyWork:'Approved distribution, service operations and commercial stability'},
  client:{department:'Dream Lovely',workScope:'client_business_expansion',
    title:'Pro Regional Manager · Dream Lovely',dailyWork:'Client business expansion, enterprise partnerships and File Folder commerce'},
} as const

/** A legacy CJ staff offer may say "Regional Manager"; the verified Pro
 * File Folder appointment and number define her Pro position. Other regular
 * Regional Managers never inherit this legacy exception. */
export function isProRegionalManagerPosition(positionTitle:unknown,fileNumber:unknown){
 const title=String(positionTitle||'').trim()
 if(/^pro\s+regional\s+manager$/i.test(title))return true
 return String(fileNumber||'')==='WEAVE-2026-0907-0001'&&
   /^(?:client\s+)?regional\s+manager$/i.test(title)
}
export function proRegionalManagerDepartment(role:unknown){
 return role==='bridger'||role==='agent'||role==='client'
  ? PRO_REGIONAL_MANAGER_DEPARTMENTS[role]
  : null
}
