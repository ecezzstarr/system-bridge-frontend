const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=path=>fs.readFileSync(path,'utf8')

const pbr=read('components/system-switch/file-folder-luxury-material.tsx')
const mech=read('components/system-switch/file-folder-plus-mechanization.tsx')
const plus=read('components/system-switch/file-folder-plus-radiant-world.tsx')
const formation=read('lib/plus-file-folder-formation.ts')
const world=read('components/system-switch/file-folder-open-world.tsx')
const official=read('lib/file-folder-world-presets.ts')

assert(pbr.includes('plus-porcelain-marble.svg')&&pbr.includes('plus-brushed-gold.svg'),
 'PBR sources must be the approved repository-owned Plus marble and gold materials')
assert(pbr.includes('new WeakMap<THREE.Texture,SurfaceMaps>()')&&
 pbr.includes('const size=192')&&pbr.includes('normalMap={derived?.normal}')&&
 pbr.includes('roughnessMap={derived?.roughness}'),
 'Physical normal/roughness maps must be cached and phone bounded')
assert(!/https?:\/\//.test(pbr),'Luxury materials must not import unapproved remote textures')
assert(pbr.includes('THREE.NoColorSpace')&&pbr.includes('THREE.SRGBColorSpace'),
 'Color and linear physical maps require distinct correct color spaces')
assert(pbr.includes("return realness==='basic'||glass?null:deriveSurfaceMaps(source,gold)"),
 'Glass and basic fidelity cannot allocate unnecessary normal/roughness maps')

assert(plus.includes("import {FileFolderLuxuryMaterial}")&&
 plus.includes("return <FileFolderLuxuryMaterial")&&
 plus.includes("import {PlusMechanizedDistrict}")&&
 plus.includes('constructionCount={formation.building}')&&
 plus.includes('activeSystemCount={formation.live}')&&
 plus.includes('progress={formation.progress}'),
 'Plus scene must physically use PBR and record-driven machinery')
assert(formation.includes("build.status==='building'")&&
 formation.includes("system.status==='active'")&&
 formation.includes('buildFormationProgress(build,now)'),
 'Construction visuals must follow verified source world records and timestamps')
assert(mech.includes('const building=constructionCount>0')&&
 mech.includes('const operating=activeSystemCount>0')&&
 mech.includes('{building&&<FormationGantry')&&
 mech.includes('{operating&&<group')&&
 mech.includes('if(reduceMotion)return')&&
 mech.includes("prefers-reduced-motion: reduce"),
 'Mechanical construction, operations and accessible motion must be appropriately gated')
assert(mech.includes('structureHeight=.35+completion*2.5')&&
 mech.includes('Math.max(0,Math.min(100,progress))'),
 'Visible assembly must be bounded to the recorded construction percentage')
assert(world.includes("fileFolderTier==='plus'")&&
 world.includes('<FileFolderPlusRadiantWorld')&&
 official.includes("theme:'plus-white-gold'"),
 'Official verified Plus routing and identity must remain intact')
assert(!/fetch\(|axios|wallet|payment|balance|credit|deposit/i.test(mech),
 'Visual mechanisms cannot mutate commerce or business records')
console.log('Plus luxury material and verified mechanization contract passed')
