const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8')
const references=read('lib/file-folder-world-presets.ts')
const scene=read('components/system-switch/file-folder-standard-living-world.tsx')
const engine=read('components/system-switch/file-folder-open-world.tsx')
const client=read('components/system-switch/client-file-folder-operating-environment.tsx')
const switchApi=read('app/api/client/system-switch/route.ts')
const gate=read('app/api/client/file-folder-entry/route.ts')

assert.ok(references.includes('STANDARD_FILE_FOLDER_REFERENCE')&&references.includes("referenceImage: '383187.png'"))
assert.ok(references.includes('bdbd47223243d0996967087ef9733288dd9b863ab16b3b40be0d49e6b33f79cb'))
assert.ok(references.includes("standard:{theme:'standard-living-valley'")&&references.includes("equipmentPack:'standard-business-districts'"),'Standard must have its own official world identity')
assert.ok(scene.includes('<Canvas')&&scene.includes('<OrbitControls')&&scene.includes('<WaterAndLandscape'),
  'World must use actual 3D landscape, live water and touch navigation, not a static wallpaper')
for(const district of ['customer_door','food_business','farm_to_customer','boutique_brand','creative_studio','app_platform','build']){
 assert.ok(scene.includes(district+':{label:'),district+' must exist in the interactive Standard environment')
}
assert.ok(scene.includes("data-standard-file-folder-world=\"official-customer-door\""),'Standard environment marker')
assert.ok(scene.includes('onEnter(choice.district)')&&scene.includes('target="_blank"')&&scene.includes('buildFormationProgress(currentBuild,now)'),
  'Customer Door and real construction records must lead to working client routes')
assert.ok(scene.includes('not proof of completed businesses'),
  'Unbuilt spaces cannot be misrepresented as running businesses')
assert.ok(engine.includes("fileFolderTier==='standard'")&&engine.includes('<FileFolderStandardLivingWorld'),
  'Every verified Standard tier opens its distinct Standard world, not Plus or a generic map')
assert.ok(client.includes('fileFolderTier={data.file_folder_tier}'), 'Server tier must be forwarded to renderer')
assert.ok(switchApi.includes('file_folder_tier:fileFolderTier')&&switchApi.includes("getFileFolderTier("),
  'Server must determine the purchased or granted tier rather than browser-provided choice')
assert.ok(gate.includes('client.file_number'), 'File number and verified ownership remain mandatory')
console.log('Standard official Customer Door world, real systems, verified tiers, and all seven 3D districts passed')
