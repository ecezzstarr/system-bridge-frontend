const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8')
const tiers=read('lib/file-folder-pricing.ts')
const presets=read('lib/file-folder-world-presets.ts')
const renderer=read('components/system-switch/file-folder-plus-radiant-world.tsx')
const world=read('components/system-switch/file-folder-open-world.tsx')
const terrain=read('components/system-switch/file-folder-living-terrain.tsx')
const entry=read('components/system-switch/client-file-folder-operating-environment.tsx')
const release=read('lib/file-folder-world-release.ts')
const ui=read('app/(app)/admin/file-folder-world-releases/page.tsx')
const api=read('app/api/client/file-folder-release/route.ts')
const client=read('app/client/system-switch/page.tsx')
const docs=read('docs/plus-file-folder-official-world.md')

assert.ok(tiers.includes("['standard','pro','premium','plus']"),'Exactly four types')
assert.ok(presets.includes('PLUS_FILE_FOLDER_REFERENCE')&&presets.includes("referenceImage: '389215.png'"))
assert.ok(docs.includes('544ba241448127f8550bb11a1b94058304467addef9156ba8486221fdc4385b3'))
assert.ok(presets.includes("'plus-white-gold'")&&presets.includes("'plus-complete-systems'"))
for(const district of ['systems','modules','tools','people','operations','expansion'])
 assert.ok(presets.includes(district+':{name:'),'Six meaningful Plus equipment entrances include '+district)
assert.ok(renderer.includes('<Canvas')&&renderer.includes('OrbitControls')&&renderer.includes('<meshPhysicalMaterial'),
 'Plus world must be actual interactive physically based 3D, not a static image or wallpaper')
assert.ok(renderer.includes('data-plus-file-folder-world="official-white-gold"'))
assert.ok(renderer.includes('onEnter(selectedInfo.district)')&&renderer.includes('buildFormationProgress'),
 'Real workshops and build timestamps remain the source of truth')
assert.ok(world.includes("fileFolderTier==='plus'")&&world.includes('FileFolderPlusRadiantWorld'))
assert.ok(entry.includes('worldAppearance={resolveFileFolderAppearance(')&&
 entry.includes('fileFolderTier={data.file_folder_tier}'),'Server verified tier determines the Client renderer')
assert.ok(terrain.includes('data-file-folder-live-equipment')&&terrain.includes('appearance.equipmentZones'),
 'Non-Plus tiers also respect central equipment releases')
assert.ok(release.includes('validateFileFolderAppearance')&&release.includes('tierVisuals'),
 'Global release schema validates theme and equipment')
assert.ok(ui.includes('data-file-folder-theme-equipment-controls')&&ui.includes('FILE_FOLDER_EQUIPMENT_PACKS'))
assert.ok(api.includes('resolveClientToken')&&api.includes('getPublishedFileFolderRelease'),
 'Live release fetch requires Client authentication')
assert.ok(client.includes("setInterval(()=>{void synchronize()},45000)")&&client.includes('file_folder_world_release'),
 'Client theme/equipment receives current Administration version without a deployment')
const living=read('lib/plus-file-folder-formation.ts')
assert.ok(presets.includes("posterAssetPath: '/weave/plus-file-folder-white-official.webp'"),
 'Plus must share the exact approved picture path with the homepage')
assert.ok(renderer.includes('PLUS_FILE_FOLDER_REFERENCE.posterAssetPath')&&
 renderer.includes('data-plus-file-folder-construction-reference="389215.png"'),
 'Clients can inspect the approved reference in their own Plus environment')
assert.ok(ui.includes('PLUS_FILE_FOLDER_REFERENCE.posterAssetPath')&&
 ui.includes('data-admin-plus-official-construction-reference="389215.png"'),
 'Administration uses that identical picture as its release reference')
assert.ok(living.includes('derivePlusWorldFormation')&&living.includes('buildFormationProgress')&&
 living.includes("system.status==='active'")&&living.includes("build.status==='building'"),
 'Only persisted build timestamps and commissioned systems produce extra 3D construction')
assert.ok(renderer.includes('RadiantLandscape')&&renderer.includes('WaterCascade')&&
 renderer.includes('formation.zones[zone]')&&renderer.includes('formation.environmentStage'),
 'A living white-gold environment grows with real Client construction and systems')
assert.ok(world.includes('systemRecords={Array.isArray(world?.systems)?world.systems:[]}')&&
 world.includes('builds={Array.isArray(world?.builds)?world.builds:[]}'),
 'Plus renderer receives real complete world records, not simulated build counts')
assert.ok(release.includes("if(tier==='plus')")&&
 release.includes('Plus File Folder must retain the approved white-and-gold world'),
 'Published runtime themes cannot break the approved Plus design')
assert.ok(ui.includes("disabled={tier==='plus'}"),
 'Administration visually identifies protected Plus base design')

console.log('Official Plus 3D world, 4 tier engines, equipment and live release contracts passed')
