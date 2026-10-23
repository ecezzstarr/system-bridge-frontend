const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const vm = require('node:vm')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8')

const engine = read('lib/video-ad-studio.ts')
const customerApi = read('app/api/video-ad-studio/route.ts')
const page = read('app/(app)/video-ad-studio/page.tsx')
const imagePage = read('app/(app)/agent/creative/page.tsx')
const agentWork = read('app/(app)/agent/work/page.tsx')
const roleWorld = read('components/world/weave-dashboard-world.tsx')
const render = read('app/api/admin/video-ads/render/route.ts')

const compiled = ts.transpileModule(engine, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText
const stub = { exports: {} }
vm.runInNewContext(compiled, {
  exports: stub.exports,
  require: name => {
    if (name === '@/lib/db') return { getPool: () => { throw Error('No database required') } }
    if (name === '@/lib/weave-receipts') return { ensureWeaveReceiptSchema: async () => {} }
    throw Error('Unexpected module import: ' + name)
  },
}, { filename: 'lib/video-ad-studio.ts' })

const { studioFeeForRole, AGENT_STUDIO_MAX_FEE_FLAME_COIN } = stub.exports
assert.equal(AGENT_STUDIO_MAX_FEE_FLAME_COIN, 1.5)
for (const [key, price] of Object.entries({
  'social-30': .3,
  'full-60': .5,
  'business-120': .75,
  'campaign-180': 1,
  'brand-360': 1.5,
})) {
  assert.equal(studioFeeForRole('agent', key, 220), price, key)
  assert.ok(studioFeeForRole('agent', key, 500) <= 1.5)
}
assert.equal(studioFeeForRole('agent', 'future-package', 200), 1.5, 'Future packages remain capped')
assert.equal(studioFeeForRole('agent', 'social-30', .1), .1, 'Already discounted prices are respected')
assert.equal(studioFeeForRole('bridger', 'brand-360', 220), 220, 'Bridger price is unaffected')
assert.equal(studioFeeForRole('client', 'brand-360', 220), 220, 'Client price is unaffected')
assert.equal(studioFeeForRole('admin', 'brand-360', 220), 220, 'Admin price is unaffected')
assert.throws(() => studioFeeForRole('agent', 'social-30', -1))

assert.ok(customerApi.includes('listVideoStudioPackages(false, user.role)'), 'Agent sees reduced rates')
assert.equal((customerApi.match(/studioFeeForRole\(user.role/g)||[]).length, 2, 'Both billing paths cap Agent fees before wallet debits')
assert.ok(customerApi.includes('price_flame_coin,') && customerApi.includes('balance_trx=balance_trx-$1'), 'Wallet and receipt record actual fee')
assert.ok(page.includes('pack.priceFlameCoin'), 'Studio UI displays returned role-specific fee')
assert.ok(imagePage.includes('canvasRef.current.toBlob'), 'Image maker exports actual PNG')
assert.equal((imagePage.match(/\['agent','bridger','client'\]\.includes\(user\.role \|\| ''\)/g)||[]).length, 2, 'Image maker admits only Agent, Bridger and Client roles')
assert.ok(imagePage.includes('0 Flame Coin') && imagePage.includes('role-based pricing shown in Video Studio'), 'Image and video cost is plain to Agent')
assert.ok(agentWork.includes("href:'/agent/creative'"), 'Agent Work links image tool')
assert.ok(roleWorld.includes('data-agent-creative-first-step'), 'Phone dashboard surfaces creative tool immediately')
assert.ok(render.includes("'-crf', '20'"), 'Video quality improved')

console.log('Agent creative tools, studio fee ceiling and role separation verified')
