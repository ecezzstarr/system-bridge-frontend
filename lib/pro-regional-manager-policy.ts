/**
 * Pro Regional Manager is an Administrations-appointed position, distinct from
 * the ordinary Bridger/Agent Regional Manager Lifestyle role.
 *
 * All Pro Regional Managers require approved employment terms, a verified
 * business plan and operating address, a personally owned Pro File Folder
 * entitlement, and independent verification of the activation payment.
 * No role, File Number, salary or folder is granted by this policy alone.
 *
 * Pro describes the File Folder tier, not the business inside it.
 * Each approved manager's original department and own business plan determine
 * their operating work. CJ's Client-owned crypto exchange is an individual
 * workshop, never a default or entitlement for other Pro managers.
 * Bridger and Agent Pro Folder ownership has a separate original-role,
 * signed and independently verified activation path.
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
