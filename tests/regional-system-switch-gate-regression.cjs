const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8')
const model=read('lib/regional-manager-operations.ts')
const api=read('app/api/regional-manager/gate/route.ts')
const ui=read('components/weave/regional-system-switch-gate.tsx')
const entrance=read('app/system-switch/page.tsx')
const regional=read('app/(app)/weave/lifestyles/regional-manager/workspace/page.tsx')
const hope=read('app/(app)/bridger/dashboard/page.tsx')
const stability=read('app/(app)/agent/dashboard/page.tsx')
const ordinary=read('app/api/regional-manager/workspace/route.ts')

assert(model.includes('weave_regional_gate_directions'),'Each regional gate retains manager directions')
assert(api.includes("if(!['agent','bridger'].includes(user.role))return null"),
  'Regional pulse is limited to assigned Hope or Stability users')
assert(api.includes("regionalTeam(null,user.id)"),'Members derive region from an authorized team assignment')
assert(api.includes("regionalTeam(managerId,null)"),'Signals are scoped to one regional team')
assert(api.includes("WHERE user_id=$1::uuid AND status='approved'"),'Region is the appointed managers recorded application')
assert(api.includes("status='active'"),'Inactive appointments cannot direct a region')
assert(api.includes('getActiveLegionEmployment'),'Exclusive Legion employment remains respected')
assert(!api.includes('getLifestyleAccess'),'Ordinary Bridgers see their regional company without a paid upgrade')
assert(!ordinary.includes('getLifestyleAccess'),'Regional task access follows assignment, not Agentic-Bridger purchase')
assert(api.includes("gate.position!=='manager'"),'Only appointed Regional Manager publishes a regional direction')
assert(api.includes("action!=='publish_direction'"),'Other callers cannot invent regional activity')
assert(api.includes("COUNT(*)::int AS count"),'Participation signals come from database evidence')
assert(api.includes("status='completed'"),'Completed work is distinct from assigned intentions')
assert(api.includes("status='sold'"),'Prospect purchase signs require completed sale')
assert(api.includes("payment_status='paid' AND status='fulfilled'"),
  'Stability signs require paid and completed fulfillment')
assert(api.includes("status='confirmed'"),'Client crossing signs require confirmed File Folder')
assert(api.includes('return {available:false,count:null,lastAt:null}'),
  'Absent evidence must be unavailable rather than invented')
assert(api.includes('Number(count.rows[0]?.count||0)>=3'),
  'Manager daily directions are rate limited')
assert(api.includes('FOR UPDATE'),'Direction publishing serializes with appointment revocation')
assert(api.includes('pg_advisory_xact_lock'),'Concurrent posts cannot evade daily limit')
assert(api.includes('WHERE id=ANY($1::uuid[]) AND is_active=true'),
  'Only current assigned workers receive a generic regional notification')
assert(!api.includes('SELECT * FROM file_folder_purchases'),
  'Regional presence never exposes private Client transaction details')
assert(!api.includes('SELECT * FROM weave_regional_daily_checkins'),
  'Regional presence never exposes personal staff support notes')
assert(ui.includes("data-regional-company-signals=\"verified\""),'Staff see others work through real company signs')
assert(ui.includes("Regional Manager's direction"), 'Manager direction appears to workers')
assert(ui.includes("data-regional-manager-gate-direction=\"authorized\""),
  'Manager gets a direction workspace without financial write powers')
assert(entrance.includes('<RegionalSystemSwitchGate compact />'), 'Gate appears before crossing the shared world')
assert(regional.includes('<RegionalSystemSwitchGate />'),'Regional workspace carries one company movement')
assert(hope.includes('<RegionalSystemSwitchGate compact />'),'Bridgers see company participation in daily work')
assert(stability.includes('<RegionalSystemSwitchGate compact />'),'Agents see company participation in daily work')
assert(entrance.includes('/system-switch/world?via=system-switch'),
  'One shared 3D System Switch world remains, not multiple disconnected worlds')
console.log('Regional System Switch company participation and authority: passed')
