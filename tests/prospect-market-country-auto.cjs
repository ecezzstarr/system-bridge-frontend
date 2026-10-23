const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

const root=path.resolve(__dirname,'..')
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8')
const engine=read('lib/prospect-market-auto.ts')
const admin=read('app/api/admin/market/prospects/auto/route.ts')
const scheduler=read('app/api/cron/prospect-market/route.ts')
const workflow=read('.github/workflows/weave-prospect-market.yml')
const page=read('app/(app)/admin/prospect-engine/page.tsx')
const reconcile=read('lib/fulfillment-agent.ts')
const market=read('lib/market.ts')

assert.match(engine,/PROSPECT_MARKET_MINIMUM = 120/)
assert.match(engine,/PROSPECT_AUTO_PACKAGE_SIZE = 5/)
assert.match(engine,/PROSPECT_COUNTRY_SPACING = 2/)
assert.match(engine,/before >= PROSPECT_MARKET_MINIMUM/)
assert.match(engine,/PROSPECT_MARKET_MINIMUM-before/)
assert.match(engine,/p\.status='published'.*p\.purchased_by IS NULL.*c\.status='packaged'/)
assert.match(engine,/pg_advisory_xact_lock/)
assert.match(engine,/SELECT 1 FROM market_prospect_contacts WHERE phone=\$1 LIMIT 1/)
assert.match(engine,/SELECT country_code FROM prospect_auto_publications ORDER BY seq DESC LIMIT \$1/)
assert.match(engine,/if \(sources\.length < PROSPECT_COUNTRY_SPACING\+1\)/)
assert.match(engine,/countrySequenceChoice\(available\.map/)
assert.match(engine,/Unverified candidate generated from an Administration-supplied country series/)
assert.match(engine,/country_code,seed_phone,next_offset,enabled/)
assert.match(engine,/count\*1\.1/)
assert.match(reconcile,/runProspectMarketAuto\(\)/)
assert.match(admin,/user\?\.role==='admin'/)
assert.match(admin,/save_country/)
assert.match(admin,/set_enabled/)
assert.match(admin,/run_now/)
assert.match(scheduler,/hasWeaveSchedulerAuthority/)
assert.match(scheduler,/weave-prospect-market\.yml/)
assert.match(workflow,/17 \* \* \* \*/)
assert.match(page,/data-auto-prospect-engine/)
assert.match(page,/Unverified Candidate Pool/)
assert.match(market,/ADD COLUMN IF NOT EXISTS country/)

// Run the actual selection helper from TypeScript as JavaScript, testing
// each step of the consecutive-country spacing rule.
const match=engine.match(/export function countrySequenceChoice\(codes: string\[\], recent: string\[\], index\?: number\) \{([\s\S]*?)\n\}/)
assert.ok(match,'Country selection helper must be exported')
const js='function countrySequenceChoice(codes, recent, index) {'+match[1]+'\n}\ncountrySequenceChoice'
const choose=vm.runInNewContext(js,{Set,randomInt:n=>0,PROSPECT_COUNTRY_SPACING:2})
for(const codes of [['NG','GH','KE'],['NG','GH','KE','ZA','GB']]){
  let recent=[]
  for(let n=0;n<250;n++){
    const next=choose(codes,recent,n)
    assert.ok(codes.includes(next))
    assert.ok(!recent.includes(next),'Country must not recur within two candidates')
    recent=[next,...recent].slice(0,2)
  }
}
assert.equal(choose(['NG','GH'],['NG','GH'],0),null)
console.log('Prospect Market country automation regression checks passed.')
