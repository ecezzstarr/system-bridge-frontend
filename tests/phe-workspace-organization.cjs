const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8')

const css=read('app/weave-phe-workspace.css')
const layout=read('app/layout.tsx')
assert(layout.includes("import './weave-phe-workspace.css'"),'PHE style must be in root layout after existing brand styling')
assert(css.includes('@media (min-width: 1024px)'),'Desktop must have a proper workspace layout')
assert(css.includes('[data-phe-role-nav]'),'Shared workstation navigation remains present')
assert(css.includes('position: sticky'),'Workstation navigation should stay accessible')
assert(css.includes('overflow-x: auto'),'Phone navigation must be usable without huge vertical tabs')
assert(css.includes('[data-phe-control-grid]'),'Administrative decisions must be grouped')
assert(css.includes('@media (prefers-reduced-motion: reduce)'),'Respect reduced motion')

for(const [file,role] of [
 ['components/agent/agent-workplace.tsx','agent'],
 ['components/bridger/bridger-workplace.tsx','bridger'],
 ['components/admin/admin-workplace.tsx','admin'],
]){
 const source=read(file)
 for(const hook of [`data-phe-role-workplace="${role}"`,'data-phe-role-content','data-phe-role-nav','data-phe-role-hero','data-phe-role-stage','data-phe-role-footer']){
   assert(source.includes(hook),`${file}: expected ${hook}`)
 }
 assert(source.includes('isVisible('),`${file}: retain Environment Organizer permissions`)
 assert(source.includes('href={'),`${file}: retain actual workstation destinations`)
}
for(const role of ['agent','bridger']){
 const source=read(`components/${role}/${role}-workplace.tsx`)
 assert(source.includes('data-phe-role-steps'),`${role}: retain daily guide`)
}
const organizer=read('app/(app)/admin/environment-organizer/page.tsx')
const organizerApi=read('app/api/admin/environment-organizer/route.ts')
const organizerDb=read('lib/weave-environment-organizer.ts')
for(const hook of [
 'data-phe-organizer="phone-first"','data-phe-organizer-filters',
 'data-phe-organizer-groups','data-phe-organizer-surface={item.surface_key}',
 'data-phe-organizer-actions','data-phe-organizer-runtime',
 "action:'move_surface'","action:'set_visibility'", "action:'restore_defaults'",
 "setView('runtime')"
]){
 assert(organizer.includes(hook),`Mobile Organizer must expose ${hook}`)
}
assert(organizer.includes('const canMove=!query.trim()'),
 'Filtered results must not pretend a move is an exact group reorder')
assert(organizer.includes('min-h-12'),
 'Phone controls need a comfortable 48px touch target')
assert(organizerApi.includes("action==='move_surface'")&&organizerApi.includes("'environment_organizer.move'"),
 'Every move must be authorized and audited')
for(const marker of ['pg_advisory_xact_lock','FOR UPDATE','BEGIN','ROLLBACK','COMMIT','unnest($1::text[],$2::integer[])']){
 assert(organizerDb.includes(marker),`Movement must be atomic: ${marker}`)
}
for(const role of ['agent','bridger','admin']){
 const work=read(`components/${role}/${role}-workplace.tsx`)
 assert(work.includes('orderFor(')&&work.includes('isVisible('),
   `Live Organizer visibility and order must drive ${role} real stations`)
}
assert(css.includes('@media (max-width: 767px)'), 'Phone is the primary PHE layout')
for(const marker of [
 '[data-phe-role-hero] { order: 0','[data-phe-role-nav] {','[data-phe-role-stage] { order: 2',
 '[data-phe-role-steps] { order: 3','[data-phe-agent-product-cards]',
 '[data-phe-organizer-actions] > button'
])assert(css.includes(marker),`Phone layout needs ${marker}`)

const district=read('components/world/role-district-environment.tsx')
assert(district.includes('data-phe-district-directory="daily-first"'),
 'Shared districts must group workstations by actual daily duties')
assert(district.includes('data-phe-district-group={group.id}'),
 'Daily work and other stations must form distinct groups')
assert(district.includes("isVisible(place.href)")&&district.includes('orderFor(a.href)'),
 'Only visible company workstations may appear and their authorized order remains intact')
assert(district.includes('data-district-scene={scene.label}'),
 'The original department environment stays active')
assert(district.includes("data-daily-place={place.daily?'true':'false'}"),
 'Existing daily station markers remain available')

const room=read('components/world/weave-system-room.tsx')
for(const hook of ['data-phe-room-grid','data-phe-room-left','data-phe-room-right','data-weave-room-stage']){
 assert(room.includes(hook),`Shared room must provide ${hook}`)
}
assert(css.includes('order: 0')&&css.includes('order: 1')&&css.includes('order: 2'),
  'Phone rooms must show active work before supporting rails')

const agent=read('app/(app)/agent/work/page.tsx')
for(const destination of ['/agility','/electrolyte','/ember','/agent/cakes','/agent/commissions','/agent/creative','/agent/outlet-training','/agent/distribution','/weave/carrier/food']){
 assert(agent.includes(destination),`Agent work preserved ${destination}`)
}
for(const hook of ['data-agent-work="true"','data-phe-agent-product-cards','id="agent-products"','id="agent-tools"','id="agent-records"']){
 assert(agent.includes(hook),`Agent work must expose ${hook}`)
}
assert(agent.includes('DAISY_PASTRIES_IMAGE_SRC'),'Official Daisy image must remain')
assert(agent.includes('/weave-food/agility.jpeg'),'Original product imagery must remain')

const control=read('app/(app)/admin/control-center/page.tsx')
for(const hook of [
 'data-admin-regional-operations','data-admin-notification-health','data-admin-company-movement-link',
 'data-admin-food-distribution-review-link','data-admin-manager-support-link',
 'data-admin-regional-manager-review-link','data-admin-pro-regional-manager-activation-link',
 'data-admin-pro-regional-manager-review-link','data-admin-code-workshop-entry',
 'data-admin-governance-policy-entry','data-admin-company-active-wallet-settings',
 'data-admin-external-client-pro-verification'
]){
 assert(control.includes(hook),`Control Center must preserve existing contract: ${hook}`)
}
assert(control.includes('<AdministrationControlTerminal />'),'Original command terminal must stay connected')
for(const anchor of ['phe-people-title','phe-evidence-title','phe-authority-title']){
 assert(control.includes(anchor),`Decisions must be organized by ${anchor}`)
}
assert(!/Math\.random\(|mock|fake revenue/i.test(control),'Organized decision deck must not manufacture financial results')

console.log('PHE workspace structure, paths, permissions, responsive hierarchy and original terminal retained')
