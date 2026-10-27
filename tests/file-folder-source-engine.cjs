const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
const moduleBox={exports:{}}
const source=fs.readFileSync('lib/file-folder-source-engine.ts','utf8').replace("import { FILE_FOLDER_PLATFORM_TEMPLATES, type FileFolderPlatformKind } from '@/lib/file-folder-platform-projects'","")
const platformTemplates={
 commerce_platform:{stages:['customer_door','commerce_storefront','marketplace_network','payments_gateway','route_station'],productionGap:'Marketplace settlement and onboarding require implementation.'},
 custom_platform:{stages:['customer_door','operations_board','mobile_service_app','integration_network'],productionGap:'Custom product requires implementation and validation.'},
 social_community:{stages:['customer_door','mobile_service_app','data_room','operations_suite','campaign_system','integration_network'],productionGap:'Community features require implementation.'},
 video_channel:{stages:['customer_door','creator_booth','broadcast_studio','streaming_gate','media_network','mobile_service_app'],productionGap:'Media production features require implementation.'},
 education_network:{stages:['customer_door','education_campus_system','learning_lab','data_room','operations_suite'],productionGap:'Education features require implementation.'},
 transportation_network:{stages:['customer_door','transport_coordination','route_station','integration_network'],productionGap:'Logistics integrations require implementation.'}
}
const js=ts.transpileModule(source,{compilerOptions:{module:1,target:9}}).outputText
vm.runInNewContext(js,{module:moduleBox,exports:moduleBox.exports,Error,Set,FILE_FOLDER_PLATFORM_TEMPLATES:platformTemplates})
const {createSourceEnginePlan,SOURCE_SYSTEM_KINDS}=moduleBox.exports
assert.equal(SOURCE_SYSTEM_KINDS.length,7)
const plan=createSourceEnginePlan({name:'Barbershop enterprise',sourceDescription:'Expand a barbershop with booking, products, staff participation and delivery.',systemKind:'commerce'})
assert.equal(plan.engine,'weave-file-folder-source-engine')
assert.equal(plan.version,1)
assert.equal(plan.systemKind,'commerce')\nassert.equal(plan.platformKind,'commerce_platform')\nassert.deepEqual(Array.from(plan.blueprintStages,stage=>stage.blueprintKey),['customer_door','commerce_storefront','marketplace_network','payments_gateway','route_station'])\nassert(plan.productionGap.includes('settlement'))\nassert(plan.blueprintStages.every(stage=>stage.status==='not_started'))
assert(plan.functions.includes('Order lifecycle'))
assert(plan.participantRoles.includes('Fulfilment partner'))
assert(plan.connections.some(item=>item.includes('Customer Door')))
assert.equal(plan.state,'conceptual')
assert(plan.executionBoundary.includes('does not execute generated code'))
assert.throws(()=>createSourceEnginePlan({name:'',sourceDescription:'Expand a business into a larger connected world',systemKind:'commerce'}))
assert.throws(()=>createSourceEnginePlan({name:'Valid name',sourceDescription:'too short',systemKind:'commerce'}))
const fallback=createSourceEnginePlan({name:'Custom system',sourceDescription:'A long enough description for a system with a custom purpose.',systemKind:'not-a-kind'})
assert.equal(fallback.systemKind,'custom')\nassert.equal(fallback.platformKind,'custom_platform')\nassert(fallback.blueprintStages.length>0)
assert(fallback.acceptanceChecks.some(item=>item.includes('permissions')))
console.log('File Folder Source Engine: typed composition, role/function mapping, invalid-input rejection and conceptual execution boundary passed')
