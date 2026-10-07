const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')

const root=path.resolve(__dirname,'..')
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8')

const engine=read('lib/weave-lifestyle.ts')
const catalog=read('lib/weave-lifestyle-catalog.ts')
const accessApi=read('app/api/weave/lifestyles/access/route.ts')
const subscribeApi=read('app/api/weave/lifestyles/subscribe/route.ts')
const page=read('app/(app)/weave/lifestyles/page.tsx')
const acePage=read('app/(app)/weave/lifestyles/ace/page.tsx')
const agenticPage=read('app/(app)/weave/lifestyles/agentic-bridger/page.tsx')
const header=read('components/app-header.tsx')
const carrierAccess=read('lib/carrier-access.ts')

assert.ok(engine.includes('FROM users')&&engine.includes('subscription_status')&&engine.includes('subscription_expiry')&&engine.includes('is_subscription_exempt'),'Lifestyle reads the monthly subscription already attached to the WEAVE user position')
assert.ok(engine.includes("['agent', 'bridger', 'client'].includes(role)"),'Agent Bridger and Client positions share the same monthly Lifestyle entitlement rule')
assert.ok(engine.includes("source: 'role_monthly_subscription'"),'Lifestyle engine identifies the role monthly subscription as its entitlement source')
assert.ok(!engine.includes('SELECT status,expires_at FROM weave_lifestyle_subscriptions'),'Legacy standalone Lifestyle subscription table no longer authorizes Lifestyle access')
assert.ok(!engine.includes('WEAVE_LIFESTYLE_MONTHLY_FLAME_COIN'),'Lifestyle no longer depends on a second monthly price environment variable')

assert.ok(catalog.includes("ACE_LIFESTYLE = 'ace'")&&catalog.includes("AGENTIC_BRIDGER_LIFESTYLE = 'agentic_bridger'")&&catalog.includes("DISTRIBUTION_MANAGER_LIFESTYLE = 'distribution_manager'"),'Canonical Lifestyle catalog names Ace, Agentic-Bridger and Distribution Manager')
assert.ok(catalog.includes("parent: ACE_LIFESTYLE")&&catalog.includes("roles: ['bridger']"),'Agentic-Bridger is a Bridger-only specialization inside Ace')
assert.ok(catalog.includes("{ label: 'Arena', href: '/arena'")&&catalog.includes("{ label: 'Carrier', href: '/weave/carrier'"),'Ace owns Arena and Carrier as its operating environments')
assert.ok(catalog.includes("label: 'Distribution Manager'")&&catalog.includes("'/distribution-studio'")&&catalog.includes("'/video-ad-studio'"),'Distribution Manager carries WEAVE distribution instruments')

assert.ok(accessApi.includes('separateLifestyleCharge: false')&&accessApi.includes('entitlement: access.source'),'Lifestyle access API returns the resolved position-subscription entitlement and no second charge')
assert.ok(subscribeApi.includes('separateLifestyleCharge: false')&&!subscribeApi.includes('UPDATE wallets')&&!subscribeApi.includes('ledger_entries'),'Legacy Lifestyle subscribe endpoint cannot debit the wallet a second time')

assert.ok(page.includes('There is no second Lifestyle subscription')&&page.includes('ONE SUBSCRIPTION · POSITION-SCOPED ACCESS'),'Lifestyle UI explains one subscription with position-scoped access')
assert.ok(page.includes('title="ACE"')&&page.includes('Arena is the Ace game ground')&&page.includes('Carrier is the Ace distribution instrument'),'Lifestyle UI presents Ace above Arena and Carrier instead of making them peer lifestyles')
assert.ok(!page.includes('ARENA LIFESTYLE')&&!page.includes('Carrier Entrance'),'Arena and Carrier are no longer rendered as separate Lifestyle identities')
assert.ok(page.includes('AGENTIC-BRIDGER')&&page.includes('Inside Ace · Bridger only'),'Agentic-Bridger is visible as a nested Bridger Lifestyle specialization')
assert.ok(page.includes('DISTRIBUTION MANAGER')&&page.includes('/manager/dashboard'),'Agent and Bridger positions can reach the Distribution Manager Lifestyle')
assert.ok(acePage.includes('data-lifestyle-home="ace"')&&acePage.includes('data-ace-environment="arena"')&&acePage.includes('data-ace-environment="carrier"'),'Ace has one home that contains Arena and Carrier')
assert.ok(agenticPage.includes('data-lifestyle-home="agentic-bridger"')&&agenticPage.includes('Eligible earning rate')&&agenticPage.includes('45%'),'Agentic-Bridger has a visible operating place with its current eligible rate')
assert.ok(header.includes("['agent','bridger','client'].includes(effectiveUser.role)")&&header.includes("router.push('/weave/lifestyles')"),'Agent Bridger and Client users can reach Lifestyle from global position controls')

assert.ok(carrierAccess.includes("role === 'agent'")&&carrierAccess.includes("role === 'bridger'")&&carrierAccess.includes("role === 'client'")&&carrierAccess.match(/getLifestyleAccess\(user\.id\)/g)?.length>=3,'Carrier checks the same position subscription for Agent Bridger and Client before applying position rules')
assert.ok(carrierAccess.includes('Carrier is one of the Ace instruments')&&carrierAccess.includes('Carrier remains Ace’s distribution instrument'),'Carrier access describes Carrier as an Ace instrument rather than a Lifestyle identity')

console.log('Lifestyle position access and identity hierarchy regression checks passed')
