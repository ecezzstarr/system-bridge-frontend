const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')

const root=path.resolve(__dirname,'..')
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8')

const engine=read('lib/weave-lifestyle.ts')
const accessApi=read('app/api/weave/lifestyles/access/route.ts')
const subscribeApi=read('app/api/weave/lifestyles/subscribe/route.ts')
const page=read('app/(app)/weave/lifestyles/page.tsx')
const header=read('components/app-header.tsx')
const carrierAccess=read('lib/carrier-access.ts')

assert.ok(engine.includes('FROM users')&&engine.includes('subscription_status')&&engine.includes('subscription_expiry')&&engine.includes('is_subscription_exempt'),'Lifestyle reads the monthly subscription already attached to the WEAVE user position')
assert.ok(engine.includes("['agent', 'bridger', 'client'].includes(role)"),'Agent Bridger and Client positions share the same monthly Lifestyle entitlement rule')
assert.ok(!engine.includes('SELECT status,expires_at FROM weave_lifestyle_subscriptions'),'Legacy standalone Lifestyle subscription table no longer authorizes Lifestyle access')
assert.ok(!engine.includes('WEAVE_LIFESTYLE_MONTHLY_FLAME_COIN'),'Lifestyle no longer depends on a second monthly price environment variable')

assert.ok(accessApi.includes('separateLifestyleCharge: false')&&accessApi.includes('role_monthly_subscription'),'Lifestyle access API declares the position subscription as the entitlement and no second charge')
assert.ok(subscribeApi.includes('separateLifestyleCharge: false')&&!subscribeApi.includes('UPDATE wallets')&&!subscribeApi.includes('ledger_entries'),'Legacy Lifestyle subscribe endpoint cannot debit the wallet a second time')

assert.ok(page.includes('There is no second Lifestyle subscription')&&page.includes('ONE SUBSCRIPTION · POSITION-SCOPED ACCESS'),'Lifestyle UI explains one subscription with position-scoped access')
assert.ok(page.includes('/manager/dashboard')&&page.includes('Manager Lifestyle'),'Agent and Bridger positions can see Manager inside the Lifestyle layer')
assert.ok(header.includes("['agent','bridger','client'].includes(effectiveUser.role)")&&header.includes("router.push('/weave/lifestyles')"),'Agent Bridger and Client users can reach Lifestyle from global position controls')

assert.ok(carrierAccess.includes("role === 'agent'")&&carrierAccess.includes("role === 'bridger'")&&carrierAccess.includes("role === 'client'")&&carrierAccess.match(/getLifestyleAccess\(user\.id\)/g)?.length>=3,'Carrier checks the same position subscription for Agent Bridger and Client before applying position rules')

console.log('Lifestyle position access regression checks passed')
