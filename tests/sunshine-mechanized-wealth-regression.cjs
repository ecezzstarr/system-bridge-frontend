const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8')
const files=[
  'lib/sunshine-bank-products.ts',
  'lib/sunshine-continuity.ts',
  'app/api/sunshine/route.ts',
  'app/(app)/weave/lifestyles/sunshine/page.tsx'
]
for(const file of files){
  const tree=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,
    file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
  assert.equal(tree.parseDiagnostics.length,0,'Parse errors: '+file)
}
const banks=read(files[0])
const schema=read(files[1])
const api=read(files[2])
const page=read(files[3])
const life=read('app/(app)/weave/lifestyles/page.tsx')
const regional=read('app/(app)/weave/lifestyles/regional-manager/workspace/page.tsx')
for(const code of [
  'ecobank_super_savers','ecobank_all_savings','opay_owealth','opay_safebox',
  'palmpay_cashbox','moniepoint_flexible','fairmoney_fairsave','kuda_flexible',
  'access_hida','stanbic_maxyield','union_unionsilver','other_savings'
])assert.ok(banks.includes("id:'"+code+"'"),'Missing verified product '+code)
assert.ok(banks.includes("rule:'two_monthly'"),'Ecobank enhanced-rate withdrawal restriction')
assert.ok(banks.includes("rule:'quarterly_window'"),'SafeBox is not falsely classified as two monthly')
assert.ok(banks.includes("rule:'one_monthly_bonus'"),'Stanbic bonus interest differs from two monthly')
assert.ok(banks.includes('No APR is embedded'),'Variable bank rates must not be hard-coded')
assert.ok(schema.includes('SUNSHINE_ENROLLMENT_TARGET_SS=1_000_000'),'Sunshine capital goal is 1m System Switch, not a minimum payment')
assert.ok(schema.includes('weave_sunshine_savings_plans'),'Owner controls savings declaration')
assert.ok(schema.includes('manager_visibility boolean NOT NULL DEFAULT false'),'Manager view opt-in defaults off')
assert.ok(schema.includes('weave_sunshine_monthly_withdrawals'),'Month-scoped withdrawal tracking')
assert.ok(schema.includes('UNIQUE(user_id,request_id)'),'Withdrawal idempotency')
assert.ok(schema.includes('weave_sunshine_monthly_living_money'),'Monthly interest-only spending record')
assert.ok(schema.includes('spent_from_interest_ngn<=net_interest_credited_ngn'),'Cannot record spending beyond reported interest')
assert.ok(api.includes("getAuthUser(request)"),'Authentication required')
assert.ok(api.includes("view')==='team'"),'Manager oversight must be a separate scoped view')
assert.ok(api.includes("managerTeam(user)"),'Team data requires live verified manager authorization')
assert.ok(api.includes('p.manager_visibility=true'),'Only consenting employees in manager feed')
assert.ok(!api.slice(api.indexOf("if(request.nextUrl.searchParams.get('view')==='team')"),
  api.indexOf("const [planResult")).includes('declared_capital_ngn'),
  'Team view never discloses personal capital')
assert.ok(api.includes("await assignedManager(user)"),'Actual assigned manager required')
assert.ok(api.includes('notifyWithdrawalTarget(managerId)'),'Two withdrawals triggers manager support alert with consent')
assert.ok(api.includes("body.acknowledgeBankOwnership!==true"),'User must confirm external bank ownership')
assert.ok(api.includes("record_living_money"),'Interest-only living money recorded')
assert.ok(api.includes("spent>interest"),'Spending cannot exceed interest in saved record')
assert.ok(page.includes('data-sunshine-earn-first'),'Earn before saving is first-class')
assert.ok(page.includes('SUNSHINE_BANK_PRODUCTS.map'),'Bank selector uses verified product catalog')
assert.ok(page.includes('selectedBank.liquidity'),'Bank-specific withdrawal policies shown')
assert.ok(page.includes('data-sunshine-actual-living-money'),'Actual net interest tracked separately from projections')
assert.ok(page.includes('data-sunshine-manager-team'),'Consenting team view')
assert.ok(page.includes('bank account')&&page.includes('Weave has no authority'),'No bank custody')
assert.ok(life.includes('data-sunshine-wealth-entry'),'Sunshine accessible in Weave Lifestyle')
assert.ok(regional.includes('data-regional-sunshine-oversight'),'Regional Manager sees Sunshine workspace')
console.log('PASS: multi-bank Sunshine, earnings-first, opt-in manager oversight, withdrawal tracking, interest-only capital continuity')
