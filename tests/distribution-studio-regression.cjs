const fs=require('fs')
const path=require('path')
const assert=require('assert')

const root=path.resolve(__dirname,'..')
const read=file=>fs.readFileSync(path.join(root,file),'utf8')

const distribution=read('lib/weave-distribution.ts')
const adminApi=read('app/api/admin/distribution-studio/route.ts')
const participantApi=read('app/api/distribution-studio/route.ts')
const adminPage=read('app/(app)/admin/distribution-studio/page.tsx')
const participantPage=read('app/(app)/distribution-studio/page.tsx')
const oversight=read('components/admin/distribution-participant-oversight.tsx')
const adminLayout=read('app/(app)/admin/distribution-studio/layout.tsx')
const registry=read('lib/weave-environment-registry.ts')
const roleDistricts=read('lib/weave-role-districts.ts')

for(const channel of ['weave-placement','carrier','video-studio','email','instagram','facebook','tiktok','youtube','x','linkedin']){
  assert.ok(distribution.includes(`key: '${channel}'`),`Distribution channel ${channel} is registered`)
}
for(const table of ['weave_distribution_channels','weave_distribution_profiles','weave_distribution_accounts','weave_distribution_content','weave_distribution_deliveries','weave_distribution_metrics']){
  assert.ok(distribution.includes(table),`${table} persists Distribution Studio state`)
}
assert.ok(distribution.includes('credential_reference')&&!distribution.includes('access_token varchar'),'Participant social credentials use a reference instead of a raw access-token column')
assert.ok(distribution.includes("role === 'admin' ? '/admin/video-ad-workshop' : '/video-ad-studio'"),'Video Studio route follows the participant position')
assert.ok(distribution.includes("role === 'bridger') return '/bridger/email-outreach'"),'Bridger keeps the existing Email Outreach engine as a native distribution channel')
assert.ok(distribution.includes('waiting_connection'),'Content can wait safely for external provider authorization')

assert.ok(adminApi.includes('ensureWeaveAdsSchema()')&&adminApi.includes('ensureCarrierSchema()'),'Administration Distribution Studio reuses existing Ads and Carrier movement records')
for(const eventType of ["event_type='entrance'","event_type='registration'","event_type='file_folder_purchase'"]){
  assert.ok(adminApi.includes(eventType),`Institutional distribution record includes ${eventType}`)
}
assert.ok(adminApi.includes('weave_distribution_profiles')&&adminApi.includes('pending_connections'),'Administration sees participant Social Presence movement without sharing credentials')
assert.ok(adminApi.includes('carrier_ace_visitors')&&adminApi.includes('carrier_ace_shares'),'Carrier reach, support and shares remain in the Administration record')

assert.ok(participantApi.includes('requireDistributionUser'),'Participant API is position-gated')
assert.ok(participantApi.includes("action === 'save_profile'")&&participantApi.includes("action === 'create_content'"),'Participants can define presence direction and form content movement')
assert.ok(participantApi.includes("action === 'request_connection'")&&participantApi.includes('providerAuthorizationRequired: true'),'External social accounts are prepared for provider authorization without faking a connection')
assert.ok(participantApi.includes('credential_reference=NULL'),'Disconnecting clears the secure provider credential reference')

assert.ok(adminPage.includes('data-distribution-studio="weave-native"'),'Administration receives the native Distribution Studio environment')
for(const route of ['/admin/ad-workshop','/admin/video-ad-workshop','/weave/carrier','/admin/email-outreach']){
  assert.ok(adminPage.includes(route),`Administration Distribution Studio connects to ${route}`)
}
assert.ok(adminPage.includes('WEAVE owns the marketing brain'),'Distribution Studio keeps WEAVE as the marketing authority')
assert.ok(adminPage.includes('MOVEMENT → VALUE'),'Administration measures beyond social reach into WEAVE value movement')

assert.ok(participantPage.includes('data-social-presence-studio={role}'),'Agent Bridger Client and Administration have a role-aware Social Presence environment')
for(const roleTitle of ['AGENT SOCIAL PRESENCE','BRIDGER SOCIAL PRESENCE','CLIENT SOCIAL PRESENCE']){
  assert.ok(participantPage.includes(roleTitle),`${roleTitle} has explicit participant language`)
}
assert.ok(participantPage.includes('No shared credentials'),'Participant channels state that credentials are not shared')
assert.ok(participantPage.includes('YOUR CONTENT')&&participantPage.includes('GROWTH RECORD'),'Participants receive a personal content queue and growth record')
assert.ok(participantPage.includes('/video-ad-studio'),'Participant Social Presence connects to the shared Video Ad Studio')

assert.ok(oversight.includes('PARTICIPANT SOCIAL PRESENCE')&&oversight.includes('CONNECTION REQUESTS'),'Administration receives participant Social Presence oversight')
assert.ok(adminLayout.includes('DistributionParticipantOversight'),'Administration Distribution Studio mounts participant oversight in the same environment')

assert.ok(registry.includes("route:'/admin/distribution-studio'"),'Environment registry contains Administration Distribution Studio')
assert.ok(registry.includes("route:'/distribution-studio'")&&registry.includes("label:'Social Presence'")&&registry.includes("scope:'shared'"),'Environment registry exposes one shared Social Presence role-world gate')
assert.ok(roleDistricts.includes("{label:'Distribution Studio',href:'/admin/distribution-studio'"),'Administration Workshops expose Distribution Studio as a canonical place')
assert.ok(!roleDistricts.includes("{label:'Social Presence',href:'/distribution-studio'"),'Agent Bridger and Client role catalogs stay focused; Social Presence is exposed once through Shared WEAVE')

console.log('Distribution Studio participant social-presence regression checks passed')
