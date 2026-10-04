const fs=require('fs')
const path=require('path')
const assert=require('assert')

const root=path.resolve(__dirname,'..')
const read=file=>fs.readFileSync(path.join(root,file),'utf8')

const distribution=read('lib/weave-distribution.ts')
const api=read('app/api/admin/distribution-studio/route.ts')
const page=read('app/(app)/admin/distribution-studio/page.tsx')
const registry=read('lib/weave-environment-registry.ts')
const roleDistricts=read('lib/weave-role-districts.ts')

for(const channel of ['weave-placement','carrier','email','instagram','facebook','tiktok','youtube','x','linkedin']){
  assert.ok(distribution.includes(`key: '${channel}'`),`Distribution channel ${channel} is registered`)
}
assert.ok(distribution.includes('weave_distribution_channels'),'Distribution channel connection state persists in WEAVE')
assert.ok(distribution.includes("channel.kind === 'native' ? 'ready' : 'disconnected'"),'Native channels begin ready while external outlets require connection')

assert.ok(api.includes('ensureWeaveAdsSchema()')&&api.includes('ensureCarrierSchema()'),'Distribution Studio reuses existing Ads and Carrier movement records')
for(const eventType of ["event_type='entrance'","event_type='registration'","event_type='file_folder_purchase'"]){
  assert.ok(api.includes(eventType),`Distribution record includes ${eventType}`)
}
assert.ok(api.includes('carrier_ace_visitors')&&api.includes('carrier_ace_shares'),'Carrier reach, support and shares are included in the Administration record')

assert.ok(page.includes('data-distribution-studio="weave-native"'),'Administration receives the native Distribution Studio environment')
for(const route of ['/admin/ad-workshop','/admin/video-ad-workshop','/weave/carrier','/admin/email-outreach']){
  assert.ok(page.includes(route),`Distribution Studio connects to ${route}`)
}
assert.ok(page.includes('WEAVE owns the marketing brain'),'Distribution Studio keeps WEAVE as the marketing authority')
assert.ok(page.includes('MOVEMENT → VALUE'),'Distribution Studio measures beyond social reach into WEAVE value movement')

assert.ok(registry.includes("route:'/admin/distribution-studio'"),'Environment registry contains Distribution Studio')
assert.ok(roleDistricts.includes("{label:'Distribution Studio',href:'/admin/distribution-studio'"),'Administration Workshops expose Distribution Studio as a canonical place')

console.log('Distribution Studio regression checks passed')
