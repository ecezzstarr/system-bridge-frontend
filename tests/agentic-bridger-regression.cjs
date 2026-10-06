const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')

const lifestyle=read('lib/weave-lifestyle.ts')
const carrierAccess=read('lib/carrier-access.ts')
const carrierApi=read('app/api/carrier/ace/route.ts')
const bridgerCommission=read('lib/bridger-commission.ts')
const referralCommission=read('lib/bridger-referral-commission.ts')
const arenaList=read('app/api/arena/matches/route.ts')
const arenaDetail=read('app/api/arena/matches/[id]/route.ts')

assert.ok(lifestyle.includes("AGENTIC_BRIDGER_EARNING_RATE = 0.50"),'Agentic-Bridger canonical earning rate is 50%')
assert.ok(lifestyle.includes("AGENTIC_BRIDGER_LIFESTYLE = 'agentic_bridger'"),'Agentic-Bridger is a named Ace lifestyle')
assert.ok(lifestyle.includes("String(role || '').toLowerCase() === 'bridger'"),'Only the Bridger role is formed into Agentic-Bridger')
assert.ok(lifestyle.includes("a.lifestyle === AGENTIC_BRIDGER_LIFESTYLE")&&lifestyle.includes('continuanceActive'),'Agentic-Bridger requires the Ace lifestyle and active Bridger Continuance')
assert.ok(carrierAccess.includes("ensureAceAccount(user.id, user.name || user.username || 'Ace', user.role)"),'Carrier passes the real company role into Ace formation')
assert.ok(carrierApi.includes("lifestyleInsideAce")&&carrierApi.includes("eligible_sales_and_activities"),'Carrier exposes Agentic-Bridger as a lifestyle inside Ace')

assert.ok(bridgerCommission.includes('getAgenticBridgerState')&&bridgerCommission.includes('agentic.active ? agentic.earningRate : WORLD_RULES.BRIDGER_YIELD_RATE'),'File Folder earnings switch from ordinary Bridger rate to Agentic-Bridger rate')
assert.ok(bridgerCommission.includes("lifestyle === 'agentic_bridger'"),'File Folder ledger and notification preserve Agentic-Bridger identity')
assert.ok(referralCommission.includes("'arena_win'")&&referralCommission.includes('getAgenticBridgerState(referrerId)'),'Arena-linked Bridger earnings resolve Agentic-Bridger state')
assert.ok(referralCommission.includes('agentic.active ? agentic.earningRate : BRIDGER_REFERRAL_RATE'),'Agentic-Bridger activity earnings override the ordinary 30% referral rate')

assert.ok(lifestyle.includes('ace_lifestyle')&&lifestyle.includes('ace_earning_rate'),'Arena schema carries the Ace lifestyle economics')
assert.ok(arenaList.includes('ace_lifestyle,ace_earning_rate')&&arenaList.includes('AGENTIC_BRIDGER_EARNING_RATE'),'New Arena activity snapshots Agentic-Bridger at 50%')
assert.ok(arenaDetail.includes('aceEarningRate')&&arenaDetail.includes('earningRate:Number(match.ace_earning_rate || 0.30)'),'Arena control and settlement retain the snapshotted earning rate')

console.log('Agentic-Bridger lifestyle, File Folder 50% and Arena activity 50% checks passed')
