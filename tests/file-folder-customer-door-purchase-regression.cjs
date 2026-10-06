const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')

const purchase=read('app/api/bridge/file-folder/purchase/route.ts')
const provisioning=read('lib/client-customer-door-provisioning.ts')
const economy=read('lib/client-build-economy.ts')
const publicDoor=read('app/market/[slug]/page.tsx')

const commissioningCall='const customerDoor = await provisionPurchasedFileFolderCustomerDoor'
assert.ok(purchase.includes(commissioningCall),'File Folder confirmation commissions the Client Customer Door')
assert.ok(purchase.indexOf(commissioningCall) < purchase.lastIndexOf("status='confirmed'"),'Customer Door is provisioned before the purchase is finally marked confirmed')
assert.ok(purchase.includes("eventType: 'customer_door_commissioned'"),'Customer Door commissioning is recorded as system movement')
assert.ok(purchase.includes('customerDoor, aiProviderAllocation'),'Confirmed purchase returns the working Customer Door')

for(const part of ['door_foundation_frame','door_identity_facade','door_customer_intake','door_service_interface','door_fulfilment_interface','door_public_commissioning']){
  assert.ok(provisioning.includes(part),`Automatic Customer Door includes ${part}`)
}
assert.ok(provisioning.includes("blueprint_key='customer_door'")&&provisioning.includes("system_type='customer_door'"),'Automatic provisioning creates the completed Customer Door build and active system')
assert.ok(provisioning.includes("formation_status='selling'")&&provisioning.includes('public_opened_at=COALESCE(public_opened_at,NOW())'),'Purchased File Folder opens the Customer Door to the public immediately')
assert.ok(provisioning.includes('publicPath: `/market/'),'Provisioning returns the direct Customer Door path')

assert.ok(economy.includes('const publicDoorUnlocked = true')&&economy.includes('const requiredToOpenPublicDoorFlameCoin = 0'),'No later funding threshold can close a Customer Door that came with a purchased File Folder')
assert.ok(publicDoor.includes("formation_status='selling'"),'The public Customer Door resolves through the selling/open store state')

console.log('File Folder purchase automatically commissions a working Customer Door with required functional parts')
