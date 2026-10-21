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
  if(name==='@/lib/distribution-team-referrals')return {DISTRIBUTION_TEAM_MONTHLY_REFERRAL_TARGET:500}
  if(name==='@/lib/referral-bonus')return {STAFF_REFERRAL_BONUS_NGN:500}
  throw new Error('Unexpected module '+name)
}}
vm.runInNewContext(moduleSource,context)
const compute=context.exports.calculateDistributionTeamCompensation

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
assert.ok(mainUI.includes('500 verified referrals')&&assistantUI.includes('Below target'),'Pay rule explained before and after appointment')
console.log('Distribution team performance-pay checks passed: 0, 499, and 500 verified referrals')
