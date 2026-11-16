const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const read=pathName=>fs.readFileSync(path.join(__dirname,'..',pathName),'utf8')
const pro=read('components/system-switch/file-folder-pro-operating-world.tsx')
const engine=read('components/system-switch/file-folder-open-world.tsx')
const policy=read('lib/pro-regional-manager-policy.ts')
const workshop=read('components/system-switch/client-workshop-world.tsx')
const existing=read('components/system-switch/file-folder-city-material.tsx')

assert(pro.includes('<Canvas')&&pro.includes('<OrbitControls')&&pro.includes('<CityMaterial'),
 'Pro is actual touch-controlled textured 3D, not a flat image or CSS card')
assert(existing.includes('city-material-atlas.png')&&existing.includes('bumpMap={surfaces.relief}'),
 'Pro uses WEAVE material atlas and relief on real 3D geometry')
assert(engine.includes("fileFolderTier==='standard'")&&
 engine.includes("fileFolderTier==='premium'")&&engine.includes("fileFolderTier==='plus'")&&
 engine.includes('<FileFolderProOperatingWorld'),
 'The verified Pro tier selects its distinct 3D File Folder without replacing other tiers')
assert(engine.includes('businessName={world?.businessFormation?.business_name||workshopTitle}')&&
 pro.includes("OWNER'S BUSINESS · PRO FILE FOLDER")&&policy.includes('Pro describes the File Folder tier'),
 'The Pro central business must be supplied from owner records, never a fixed industry')
assert(!pro.includes('crypto_exchange')&&!pro.includes('CJ_DORADO_FILE_NUMBER'),
 'Never turn one staff member’s crypto workshop into everyone’s Pro environment')
assert(workshop.includes("workshop.type==='crypto_exchange'"),
 'An actual crypto business retains its dedicated, owner-scoped operating workshop')
for(const key of ['blueprint_foundry','build_market','parts_workshop','formation_yard','active_systems','library_district','workshop_core'])
 assert(pro.includes("district:'"+key+"'"),'3D Pro station must enter persisted district '+key)
assert(pro.includes("platformProjects={")===false&&engine.includes('platformProjects={Array.isArray(world?.platformProjects)?world.platformProjects:[]}'),
 'Platform project totals are supplied from actual server data')
assert(pro.includes("buildFormationProgress(b,now)")&&pro.includes("status==='building'")&&
 pro.includes("status==='active'")&&pro.includes('data-pro-world-records="verified-server-state"'),
 'Only actual building timestamps and commissioned records create live world structures')
assert(pro.includes('ProWorldRecovery')&&pro.includes('aria-label="Pro File Folder working workshops"'),
 'Real workshop controls remain accessible when WebGL is unavailable')
assert(!pro.includes('<img')&&!pro.includes('posterAssetPath'),
 'A static poster never replaces the owned interactive Pro world')
console.log('Pro File Folder: 3D texture, business identity, working districts and verified state passed')
