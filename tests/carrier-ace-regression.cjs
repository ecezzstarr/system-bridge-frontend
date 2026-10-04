const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')

const root=path.resolve(__dirname,'..')
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8')

const carrier=read('lib/carrier.ts')
const carrierAccess=read('lib/carrier-access.ts')
const carrierAccessApi=read('app/api/carrier/access/route.ts')
const carrierConsole=read('app/(app)/weave/carrier/page.tsx')
const carrierApi=read('app/api/carrier/ace/route.ts')
const publicApi=read('app/api/carrier/ace/[matchId]/route.ts')
const engageApi=read('app/api/carrier/ace/[matchId]/engage/route.ts')
const publicPage=read('components/carrier/ace-carrier-public.tsx')
const lifestyle=read('app/(app)/weave/lifestyles/page.tsx')
const arenaApi=read('app/api/arena/matches/route.ts')
const arena=read('components/places/arena.tsx')
const appHeader=read('components/app-header.tsx')

assert.ok(carrier.includes('carrier_ace_publications')&&carrier.includes('carrier_ace_visitors')&&carrier.includes('carrier_ace_shares'),'Carrier persists publications, unique public reach, support and sharing')
assert.ok(carrier.includes('carrierSchemaPromise')&&carrier.includes('initializeCarrierSchema'),'Carrier schema setup is cached per runtime instead of running DDL on every public poll')

assert.ok(carrierAccess.includes("role === 'admin'")&&carrierAccess.includes("gate: 'administration'")&&carrierAccess.includes('active: true'),'Administration has direct Carrier entrance')
assert.ok(carrierAccess.includes("role === 'agent'")&&carrierAccess.includes('getLifestyleAccess(user.id)')&&carrierAccess.includes("gate: 'agent_subscription'"),'Agents enter Carrier through the monthly Weave subscription')
assert.ok(carrierAccess.includes("role === 'bridger'")&&carrierAccess.includes('subscription_status')&&carrierAccess.includes('is_subscription_exempt')&&carrierAccess.includes("gate: 'bridger_continuance'"),'Bridgers enter Carrier through active Continuance')
assert.ok(carrierAccess.includes("role === 'client'")&&carrierAccess.includes("position === 'lord'")&&carrierAccess.includes("position === 'lady'")&&carrierAccess.includes("gate: 'lord_lady'"),'Clients enter Carrier only after Lord or Lady elevation')
assert.ok(carrierAccess.includes("position: 'Ace'")&&carrierAccess.includes('ensureAceAccount'),'Every admitted Carrier user receives the Ace identity')
assert.ok(carrierAccessApi.includes("identityInsideCarrier: access.active ? 'Ace' : null"),'Carrier access API exposes Ace as the environment identity')

assert.ok(carrierApi.includes('requireCarrierAccess')&&!carrierApi.includes('requireLifestyleAccess')&&carrierApi.includes("String(match.host_id) !== String(user.id)"),'Carrier publishing follows role-qualified entrance and stays owned by the playing Ace')
assert.ok(carrierApi.includes('getAceCarrierUrl')&&carrierApi.includes('shareText'),'Ace publishing returns a direct public Carrier and ready-to-send marketing copy')
assert.ok(arenaApi.includes('requireCarrierAccess(authUser)')&&arenaApi.includes("identity: 'Ace'"),'Playing in Arena is gated by Carrier eligibility rather than one generic subscription')
assert.ok(arena.includes("fetch('/api/carrier/access'")&&arena.includes('Inside Carrier every qualified participant is an Ace'),'Arena presents the Carrier Ace identity and entrance rules')

assert.ok(appHeader.includes("fetch('/api/carrier/access'")&&appHeader.includes('Carrier · Enter as Ace')&&appHeader.includes('carrierOpen &&'),'The Carrier entrance appears in the global position control only after qualification')
assert.ok(carrierConsole.includes('Inside Carrier · You are Ace')&&carrierConsole.includes('PUBLISH CARRIER')&&carrierConsole.includes('WHATSAPP'),'Carrier is an Ace environment with its publishing system inside it')
assert.ok(lifestyle.includes('carrierOpen &&')&&lifestyle.includes('Carrier Entrance')&&lifestyle.includes('ENTER AS ACE'),'Subscribed WEAVE only reveals its Carrier entrance after the current role qualifies')

assert.ok(!publicApi.includes('getAuthUser')&&publicApi.includes('getPublicAceCarrier'),'Public Carrier read has no account wall')
assert.ok(engageApi.includes("['view', 'support', 'share']")&&engageApi.includes('carrier_ace_visitors'),'Outsiders can enter, support and carry the activity onward without registration')
assert.ok(publicPage.includes('No WEAVE account is required')&&publicPage.includes('https://wa.me/')&&publicPage.includes('<iframe'),'Carrier is a direct public watch surface with WhatsApp distribution')

console.log('Ace Carrier regression checks passed')
