const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=file=>fs.readFileSync(path.join(root,file),'utf8')
const paths=[
  'app/(app)/manager/dashboard/page.tsx',
  'components/distribution/team-task-board.tsx',
  'components/weave/regional-manager-command-center.tsx',
  'app/(app)/weave/lifestyles/regional-manager/workspace/page.tsx',
  'lib/distribution-team-tasks.ts',
  'lib/distribution-team-updates.ts',
]
const sources=Object.fromEntries(paths.map(p=>[p,read(p)]))
for(const p of paths){
  const tree=ts.createSourceFile(p,sources[p],ts.ScriptTarget.Latest,true,p.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
  assert.equal(tree.parseDiagnostics.length,0,'Manager work source must parse: '+p)
}
const manager=sources[paths[0]]
const taskBoard=sources[paths[1]]
const regionalCenter=sources[paths[2]]
const regionalPage=sources[paths[3]]
const tasks=sources[paths[4]]
const team=sources[paths[5]]
const catalog=read('lib/weave-lifestyle-catalog.ts')
assert(manager.includes('data-distribution-manager-first-day="verified-actions"'),'Verified lead sees clear daily workflow')
for(const id of ['distribution-assistant-appointments','distribution-team-communications','distribution-campaign-tools','distribution-manager-pay']){
  assert(manager.includes('#'+id),'Daily actions reach working area: '+id)
}
assert(manager.includes('visiblePoll(')&&manager.includes('20000'),'Lead reads fresh appointment and performance state while visible')
assert(manager.includes('assistantError')&&manager.includes('Refresh before deciding appointments'),'Assistant review failure cannot silently hide the queue')
assert(taskBoard.includes('id="distribution-task-workshop"'),'Team task anchor resolves')
assert(taskBoard.includes('const visibleTasks=isLead?data.tasks:data.tasks.filter('),'Assistants see only their tasks')
assert(taskBoard.includes("const canStart=mine&&task.status==='assigned'"),'Staff cannot begin colleagues\' tasks in UI')
assert(tasks.includes('AND ($2::boolean OR t.assigned_user_id=$3::uuid)'),'Assistant task queries scope data before SQL limit')
assert(tasks.includes("task.status==='assigned'&&next==='in_progress'&&isAssignee"),'Server authorizes only the real assignee to start')
assert(!tasks.includes('(isAssignee||isLead)'),'Lead has no impersonation start privilege')
assert(tasks.includes("task.status==='submitted'&&next==='completed'&&isLead"),'Only verified lead approves submitted work')
assert(team.includes('getActiveLegionEmployment(sql,userId)'),'Exclusive Legion employment suspends distribution communications')
assert(team.includes('AND u.is_active=true'),'Inactive staff excluded from communication roster')
assert(regionalCenter.includes('id="regional-manager-command-center"'),'Overview navigation has a real scroll target')
assert(!regionalCenter.includes('First Day Setup')&&!regionalCenter.includes('Live Regional Workspace'),'Duplicate regional work cards removed')
assert(regionalCenter.includes('No staff assigned to this region yet'),'Missing Administration assignment is explicit')
assert(regionalPage.includes('visiblePoll(()=>load(),20000)'),'Regional records refresh visibly without overlapping background polling')
assert(regionalPage.includes("data.tasks.slice().sort("),'Submitted tasks appear first for review')
assert(regionalPage.includes('Review submitted tasks'),'Regional attention queue has a direct action')
const supportStart=regionalPage.indexOf('id="regional-panel-support"')
const loanDesk=regionalPage.indexOf('<RegionalEntryLoanDesk token=')
const taskSection=regionalPage.indexOf('id="regional-panel-tasks"')
assert(supportStart>=0&&loanDesk>supportStart&&loanDesk<taskSection,'Entry loan work belongs inside Regional Support')
assert(catalog.includes('Up to twenty Assistant Distribution Manager appointments'),'Lifestyle capacity reflects 10 leads and 20 assistants')
console.log('PASS: Manager first-day actions, task privacy and authority, support routing, capacity, payroll visibility and TS/TSX parsing')
