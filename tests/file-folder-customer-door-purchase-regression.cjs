const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')

const purchase=read('app/api/bridge/file-folder/purchase/route.ts')
const provisioning=read('lib/client-customer-door-provisioning.ts')
const economy=read('lib/client-build-economy.ts')
const publicDoor=read('app/market/[slug]/page.tsx')
const world=read('lib/client-file-folder-world.ts')

const commissioningCall='const customerDoor = await provisionPurchasedFileFolderCustomerDoor'
assert.ok(purchase.includes(commissioningCall),'File Folder confirmation starts the included Client Customer Door')
assert.ok(purchase.indexOf(commissioningCall) < purchase.lastIndexOf("status='confirmed'"),'Customer Door formation is attached before purchase confirmation completes')
assert.ok(purchase.includes("eventType: 'customer_door_construction_started'"),'Customer Door start is recorded as construction movement')
assert.ok(purchase.includes('customerDoor, aiProviderAllocation'),'Confirmed purchase returns the Customer Door build state')

for(const part of ['door_foundation_frame','door_identity_facade','door_customer_intake','door_service_interface','door_fulfilment_interface','door_public_commissioning']){
  assert.ok(provisioning.includes(part),`Automatic Customer Door includes ${part}`)
}
assert.ok(provisioning.includes("'building'")&&provisioning.includes('completes_at')&&provisioning.includes('effectiveBuildMinutes'),'Purchased Customer Door keeps a real construction timer')
assert.ok(provisioning.includes('purchase_speed_multiplier')&&provisioning.includes('boostOptional: true'),'Purchased Customer Door remains compatible with optional boosts')
assert.ok(!provisioning.includes("'completed',\n        0,0,0"),'Purchase does not bypass Customer Door construction time')
assert.ok(provisioning.includes("formation_status='forming'")&&provisioning.includes('public_opened_at=NULL'),'Public Customer Door stays closed while construction is active')
assert.ok(provisioning.includes('publicPath: `/market/'),'Provisioning reserves the direct Customer Door path')

assert.ok(world.includes("status='building' AND completes_at <= NOW()")&&world.includes("system_type === 'customer_door'"),'Existing world finalizer activates Customer Door only after construction time completes')
assert.ok(economy.includes('const publicDoorUnlocked = true')&&economy.includes('const requiredToOpenPublicDoorFlameCoin = 0'),'No funding threshold blocks the included Customer Door; timing and boosts govern formation')
assert.ok(publicDoor.includes("formation_status='selling' OR formation_status='ready_for_offer'"),'Completed Customer Door opens publicly after build completion, with or without a first offer')

console.log('File Folder purchase includes all Customer Door parts while preserving construction time and optional boosts')
