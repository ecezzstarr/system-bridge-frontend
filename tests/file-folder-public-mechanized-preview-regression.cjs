const assert=require('node:assert/strict')
const fs=require('node:fs')
const read=path=>fs.readFileSync(path,'utf8')

const model=read('components/public/file-folder-mechanized-preview.tsx')
const page=read('app/file-folder-preview/page.tsx')
const pro=read('components/public/pro-file-folder-preview.tsx')
const purchase=read('app/file-folder/page.tsx')
const plus=read('components/system-switch/file-folder-plus-radiant-world.tsx')

for(const tier of ['standard','pro','premium','plus']){
 assert(model.includes(tier+':{base:'),'Every preview tier must have its own physically distinct architecture: '+tier)
 assert(page.includes("id: '"+tier+"'"),'Do not remove a File Folder tier from the public comparison: '+tier)
}
assert(model.includes('<AdaptiveCanvas')&&model.includes('<OrbitControls'),
 'A mechanized preview must be real client-side 3D with orbit and zoom controls')
assert(model.includes('<extrudeGeometry')&&model.includes('<MechanizedGear')&&
 model.includes('<Landmark')&&model.includes('<WorkingDistrict'),
 'Architectural models must include gear geometry, sculpted buildings and separate districts')
assert(model.includes('prefers-reduced-motion: reduce')&&
 model.includes("if(rotor.current&&!reducedMotion)"),
 'Motion must stop on reduced-motion preference')
assert(model.includes('SceneRecovery')&&model.includes('fallback='),
 'WebGL recovery and loading fallback must exist')
assert(model.includes('public architectural models')||model.includes('Public architectural models'),
 'Preview must be explicitly identified as a non-operating concept')
assert(model.includes('equipment at rest')&&model.includes('<FileFolderWorkshopRoom tier={tier}/>'),
 'No public preview may represent fictional sales or active Client systems')
assert(!model.includes('fetch(')&&!model.includes("'/api/")&&
 !model.includes('localStorage')&&!model.includes('sessionStorage'),
 'The preview must not read private Client state or manipulate purchases')
assert(model.includes("tier==='plus'")&&model.includes('FileFolderLuxuryMaterial'),
 'Plus concept must use its approved marble and gold PBR implementation')
assert(model.includes('CityMaterial'),'Other tiers retain repository-owned physical texture atlas')

assert(page.includes("tier.id === 'plus' || tier.id === 'pro'")&&
 page.includes('tier.image')&&page.includes('mechanizedTier===tier.id')&&
 page.includes('View tier artwork')&&page.includes('Explore mechanized 3D'),
 'Preserve approved Pro/Plus artwork while making models optional for all four tiers')
assert(pro.includes('PRO_FILE_FOLDER_REFERENCE.posterAssetPath')&&
 pro.includes('viewMechanized')&&pro.includes('<FileFolderMechanizedPreview tier="pro"/>'),
 'Bridger and public Pro prospect previews must use the same approved art and optional 3D model')
assert(!pro.includes("['Operations', 'Active']"),
 'Demonstration cannot imply that a Client business is actually active')
assert(purchase.includes('data-public-purchase-tier-model={tier}')&&
 purchase.includes('<FileFolderMechanizedPreview tier={tier}/>')&&
 purchase.includes('Compare all four File Folder environments'),
 'Public tier selection must provide an optional 3D inspection of the selected tier')
assert(purchase.includes("params.get('tier')")&&
 purchase.includes("tier === 'premium'")&&
 purchase.includes("tier === 'plus'")&&
 purchase.includes("fetch('/api/public/file-folder/purchase'")&&
 purchase.includes("useState<'paystack' | 'trx'>('paystack')"),
 '3D previews must not disturb the public purchase and Paystack/TRX choice workflow')
assert(plus.includes('<PlusMechanizedDistrict')&&plus.includes('FileFolderLuxuryMaterial'),
 'Live Plus world must remain physically mechanized beyond its public concept preview')
console.log('Four-tier public mechanized File Folder preview and purchase safeguards: OK')
