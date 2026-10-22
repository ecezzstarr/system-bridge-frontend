const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')
const vm=require('node:vm')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const source=read('lib/distribution-team-compensation.ts')
const moduleSource=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const context={exports:{},require(name){
  if(name==='@/lib/distribution-team-referrals')return {DISTRIBUTION_TEAM_MONTHLY_REFERRAL_TARGET:500,DISTRIBUTION_TEAM_PROBATION_REFERRAL_TARGET:300}
  if(name==='@/lib/referral-bonus')return {STAFF_REFERRAL_BONUS_NGN:500}
  throw new Error('Unexpected module '+name)
}}
vm.runInNewContext(moduleSource,context)
const compute=context.exports.calculateDistributionTeamCompensation

const probationBelow=compute({teamReferrals:299,ownReferrals:70,monthlySalaryNgn:70000,teamTarget:300})
assert.equal(probationBelow.teamQualified,false,'299 probation referrals are below the team target')
assert.equal(probationBelow.salaryEntitlementNgn,0,'No salary below the probation team target')
assert.equal(probationBelow.individualReferralBonusNgn,35000,'Below probation target, earn only own referral bonuses')

const probationAt=compute({teamReferrals:300,ownReferrals:70,monthlySalaryNgn:70000,teamTarget:300})
assert.equal(probationAt.teamTarget,300,'Initial team probation target is 300')
assert.equal(probationAt.teamQualified,true,'300 referrals meet the one-month probation requirement')
assert.equal(probationAt.salaryEntitlementNgn,70000,'Manager earns full salary eligibility in qualifying probation month')
const probationAssistant=compute({teamReferrals:300,ownReferrals:0,monthlySalaryNgn:30000,teamTarget:300})
assert.equal(probationAssistant.salaryEntitlementNgn,30000,'Assigned assistant can qualify through team probation achievement')
assert.equal(probationAssistant.individualReferralBonusNgn,0,'Do not invent individual bonuses')

const helper=read('lib/distribution-team-referrals.ts')
const helperModule=ts.transpileModule(helper,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const helperContext={exports:{},require(name){
  if(name==='@/lib/db')return {getPool(){throw new Error('Period calculation must not touch database')}}
  throw new Error('Unexpected helper import '+name)
}}
vm.runInNewContext(helperModule,helperContext)
const period=helperContext.exports.getDistributionEmploymentPeriod
const monthStart='2026-10-21T10:00:00.000Z'
const first=period(monthStart,new Date('2026-11-20T10:00:00.000Z'))
assert.equal(first.target,300,'Probation remains 300 when it spans two calendar months')
assert.equal(first.monthNumber,1,'First employment month has one 300-referral target')
const next=period(monthStart,new Date('2026-11-21T10:00:00.000Z'))
assert.equal(next.target,500,'Anniversary moves team to regular 500 target')
assert.equal(next.monthNumber,2,'Second employment month is after probation')
assert.equal(next.periodStart.toISOString(),'2026-11-21T10:00:00.000Z','Next period begins exactly at employment month anniversary')
const endOfMonth=period('2026-01-31T12:00:00.000Z',new Date('2026-02-27T12:00:00.000Z'))
assert.equal(endOfMonth.target,300,'Late-January probation remains active before February anniversary')
const endOfProbation=period('2026-01-31T12:00:00.000Z',new Date('2026-02-28T12:00:00.000Z'))
assert.equal(endOfProbation.target,500,'Month-end clamping advances January 31 probation on February 28')


const below=compute({teamReferrals:499,ownReferrals:120,monthlySalaryNgn:70000})
assert.equal(below.teamQualified,false,'499 team referrals do not earn a full salary')
assert.equal(below.salaryEntitlementNgn,0,'No manager salary below target')
assert.equal(below.individualReferralBonusNgn,60000,'Only 120 personally referred candidates earn 120 × ₦500')
assert.equal(below.illustrativeCombinedNgn,60000,'Below target only individual referral payments apply')

const at=compute({teamReferrals:500,ownReferrals:120,monthlySalaryNgn:70000})
assert.equal(at.teamQualified,true,'Exactly 500 meets team target')
assert.equal(at.salaryEntitlementNgn,70000,'Full main Manager salary becomes eligible')
assert.equal(at.individualReferralBonusNgn,60000,'Bonuses remain attributable individually')
assert.equal(at.illustrativeCombinedNgn,130000,'Monthly salary plus existing individual referral value')

const assistantBelow=compute({teamReferrals:499,ownReferrals:80,monthlySalaryNgn:30000})
assert.equal(assistantBelow.salaryEntitlementNgn,0,'No assistant salary when team misses target')
assert.equal(assistantBelow.individualReferralBonusNgn,40000,'Assistant receives only their own 80 referrals')

const assistantAt=compute({teamReferrals:500,ownReferrals:0,monthlySalaryNgn:30000})
assert.equal(assistantAt.salaryEntitlementNgn,30000,'Team achievement makes full assistant salary eligible')
assert.equal(assistantAt.individualReferralBonusNgn,0,'No invented referral earnings for assistant with no referrals')

const none=compute({teamReferrals:0,ownReferrals:0,monthlySalaryNgn:30000})
assert.equal(none.illustrativeCombinedNgn,0,'No team achievement or referrals means no pay')
assert.equal(at.periodStatus,'provisional_current_month','Midmonth preview never claims a salary was paid')
assert.equal(at.salaryPaymentSource,'forensic_payroll_approval_required','Forensics controls salary release')
assert.equal(below.referralPaymentSource,'existing_referral_bonus_awards_ledger','Do not duplicate previously credited referral bonuses')
assert.ok(!/INSERT INTO|UPDATE wallets|ledger_entries/.test(source),'Policy helper does not transfer funds')

const manager=read('lib/manager-employment.ts')
const assistants=read('lib/distribution-assistants.ts')
const mainUI=read('app/(app)/manager/dashboard/page.tsx')
const assistantUI=read('app/(app)/weave/lifestyles/distribution-assistant/page.tsx')
assert.ok(manager.includes('calculateDistributionTeamCompensation')&&assistants.includes('calculateDistributionTeamCompensation'),'Both roles follow one policy')
assert.ok(mainUI.includes('state.compensation?.salaryEntitlementNgn')&&assistantUI.includes('state.compensation?.salaryEntitlementNgn'),'Both roles see conditional salary')
assert.ok(mainUI.includes('300 verified Agent or Bridger referrals')&&assistantUI.includes('300 verified referrals'),'Probation-specific and regular team salary rules are visible')
console.log('Distribution performance checks passed: probation 299/300, ongoing 499/500, employment anniversaries and date clamping')
