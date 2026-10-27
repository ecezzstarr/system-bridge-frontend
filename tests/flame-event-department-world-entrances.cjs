const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const event=read('components/events/position-event-world.tsx')
const staff=read('app/(app)/event/page.tsx')
const clientEvent=read('app/client/event/page.tsx')
const agent=read('app/(app)/agent/dashboard/page.tsx')
const bridger=read('app/(app)/bridger/dashboard/page.tsx')
const admin=read('app/(app)/admin/dashboard/page.tsx')
const client=read('app/client/dashboard/page.tsx')
const worlds=[
 {role:'admin',label:'Administration World',href:'/admin/dashboard',dept:'Administration · A Time'},
 {role:'agent',label:'Agent World',href:'/agent/dashboard',dept:'Stability'},
 {role:'bridger',label:'Bridger World',href:'/bridger/dashboard',dept:'Hope'},
 {role:'client',label:'Client World',href:'/client/dashboard',dept:'Dream Lovely'},
]
assert.ok(event.includes('const ROLE_DEPARTMENT_WORLD: Record<EventRole'),'Event contains one role-to-department-world mapping')
for(const item of worlds){
 const line=event.split('\n').find(line=>line.trim().startsWith(item.role+':{label:'))
 assert.ok(line&&line.includes("label:'"+item.label+"'")&&line.includes("href:'"+item.href+"'")&&line.includes("department:'"+item.dept+"'"),item.role+' links to its own real department world')
 assert.equal(event.split("href:'"+item.href+"'").length-1,1,'Each world appears once in the event page mapping')
 const page=item.role==='admin'?admin:item.role==='agent'?agent:item.role==='bridger'?bridger:client
 assert.ok(page.includes('<WeaveDashboardWorld role="'+item.role+'"'),item.role+' opens its real existing world')
}
assert.ok(event.includes('data-flame-event-own-world-entry={role}')&&event.includes('href={departmentWorld.href}'),'The role world entrance is bound to the authenticated role')
assert.ok(event.includes('ROLE_WORK_ENTRANCES[role]'),'Other event work stays role-filtered')
assert.ok(!event.includes("label: 'Client World'"),'Client World is not duplicated in secondary navigation')
assert.ok(staff.includes("['admin', 'agent', 'bridger'].includes(user.role)")&&staff.includes('<PositionEventWorld role={role}'),'Staff event role comes from AuthProvider')
assert.ok(clientEvent.includes("user?.role !== 'client'")&&clientEvent.includes('role="client"'),'Client event remains authenticated')
assert.ok(agent.includes("user.role!=='agent'")&&agent.includes("if(!user||user.role!=='agent')return null"),'Agent cannot render other role world')
assert.ok(bridger.includes("user.role!=='bridger'")&&bridger.includes("user?.role!=='bridger')return null"),'Bridger cannot render other role world')
assert.ok(admin.includes("user.role!=='admin'")&&admin.includes("user?.role!=='admin')return null"),'Administration cannot render other role world')
assert.ok(event.includes('<BurningRiverOfficialGateway staff staffHref={switchHref} />'),'Existing Flame Event entrance remains')
assert.ok(event.includes('data-flame-event-system-switch-entry="true"'),'System Switch remains separate')
console.log('PASS: Flame Event shows only the authenticated Agent, Bridger, Administration or Client World')
