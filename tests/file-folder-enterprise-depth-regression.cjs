const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=file=>fs.readFileSync(file,'utf8')

const surfaces=read('components/system-switch/file-folder-enterprise-surfaces.tsx')
const interiors=read('components/system-switch/file-folder-enterprise-interior.tsx')
const standard=read('components/system-switch/file-folder-standard-living-world.tsx')
const pro=read('components/system-switch/file-folder-pro-operating-world.tsx')
const premium=read('components/system-switch/file-folder-premium-world.tsx')
const plus=read('components/system-switch/file-folder-plus-radiant-world.tsx')
const publicPreview=read('components/public/file-folder-mechanized-preview.tsx')

for(const tier of ['standard','pro','premium','plus']){
 assert(surfaces.includes(tier+':{structure:'),'Material library must preserve the distinct '+tier+' finish')
 const source={standard,pro,premium,plus}[tier]
 assert(source.includes('<EnterpriseWorkshopInterior tier="'+tier+'"'),
  'Owner '+tier+' world needs a visible furnished architectural workshop')
 assert(source.includes('<EnterpriseWaterMaterial tier="'+tier+'"'),
  'Owner '+tier+' must use normal-mapped water and retain its existing landscape')
 assert(publicPreview.includes('<EnterpriseWaterMaterial tier={tier}/>')&&
  publicPreview.includes('<EnterpriseWorkshopInterior tier={tier}/>'),
  'Public tier previews must display matching enterprise interiors and water')
}

assert(surfaces.includes('new THREE.DataTexture')&&surfaces.includes('normalMap={map}')&&
 surfaces.includes('map.offset.x=')&&surfaces.includes('map.offset.y='),
 'Water must have a physically lit normal map with subdued 3D flow')
assert(surfaces.includes('meshPhysicalMaterial')&&surfaces.includes('ior={1.45}')&&
 surfaces.includes('thickness={.18}')&&surfaces.includes('clearcoat={1}'),
 'Transparent enterprise glazing must have consistent physically inspired glass settings')
assert(surfaces.includes("kind={surface==='metal'?'metal':surface==='floor'?'paving':'warm'}")&&
 surfaces.includes("tier==='plus'"),
 'Shared surfaces must use the existing tier-appropriate texture assets')
assert(!surfaces.includes('fetch(')&&!/https?:\/\//.test(surfaces),
 'Shared materials must not fetch external assets or business records')

assert(interiors.includes('gearShape')&&interiors.includes('<extrudeGeometry')&&
 interiors.includes('Conveyor remains installed')&&interiors.includes('Behind the front glass')&&
 interiors.includes('Construction-only gantry'),
 'Enterprise environments need modeled internal consoles, conveyor and detailed machinery')
assert(interiors.includes('const building=buildCount>0')&&
 interiors.includes('const operating=liveCount>0')&&
 interiors.includes('{building&&<group')&&interiors.includes('{operating&&<mesh'),
 'Visible construction and operating indications require actual persisted records')
assert(interiors.includes('Math.max(0,Math.min(100,progress))')&&
 interiors.includes('if(reduceMotion)return')&&
 interiors.includes('prefers-reduced-motion: reduce'),
 'Moving parts must respect recorded progress and reduced-motion accessibility')
assert(!/fetch\(|axios|wallet|payment|balance|credit|deposit/i.test(interiors),
 'Enterprise visual machinery must not change commerce, Client accounts, or payments')

assert(standard.includes('buildCount={buildCount} progress={progress}')&&
 standard.includes('liveCount={live.size}'),
 'Standard must pass verified build and operation state')
assert(pro.includes("builds.filter(b=>b.status==='building')")&&
 pro.includes("systems.filter(s=>s.status==='active')"),
 'Pro must pass verified construction and active system states')
assert(premium.includes("builds.filter(b=>b.status==='building')")&&
 premium.includes('liveCount={live}'),
 'Premium must pass its verified working state')
assert(plus.includes('buildCount={formation.activeBuilds}')&&
 plus.includes('liveCount={formation.liveSystems}'),
 'Plus interiors must read persisted formation instead of fictional business activity')
assert(publicPreview.includes('EnterpriseWorkshopInterior tier={tier}/>')&&
 !publicPreview.includes('buildCount=')&&!publicPreview.includes('liveCount='),
 'Public preview interiors are non-operational architectural examples')
const room=read('components/system-switch/file-folder-workshop-interior.tsx')
const owner=read('components/system-switch/client-file-folder-operating-environment.tsx')
const sharedRoom=read('components/system-switch/file-folder-workshop-room.tsx')
assert(room.includes('<FileFolderWorkshopRoom tier={tier}')&&sharedRoom.includes('<EnterpriseWorkshopInterior tier={tier} buildCount={buildCount} liveCount={liveCount} progress={progress}/>')&&
 owner.includes('tier={workshopTier}')&&owner.includes('buildCount={activeBuilds.length} liveCount={activeSystems.length}'),
 'The walk-in owner workshop must share the estate equipment and use the purchased finish and recorded activity')
assert(owner.includes('onOperate={operateWorkbench}')&&owner.includes('ref={districtTools}')&&
 room.includes('position:FILE_FOLDER_WORKBENCH'),
 'The accessible tools shortcut and the physical workbench must lead to the district controls')
console.log('Client File Folder interiors, PBR glass, textured water and mechanical state: OK')
