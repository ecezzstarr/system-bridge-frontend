const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8')

const world=read('components/system-switch/file-folder-pro-operating-world.tsx')
const consoleSource=read('components/system-switch/file-folder-pro-build-console.tsx')
const engine=read('components/system-switch/file-folder-open-world.tsx')
const api=read('app/api/client/file-folder-world/route.ts')
const proApi=read('app/api/pro-regional-manager/file-folder-world/route.ts')
const material=read('components/system-switch/file-folder-city-material.tsx')

assert(world.includes("id:'plans',label:'Building Plans',district:'blueprint_foundry'"),
 'Pro must have a physical building-plan station, not just a banner')
assert(world.includes("id:'speed',label:'Speed Bay',district:'boost_bay'"),
 'Pro must have an enterable Speed Bay in its 3D world')
assert(world.includes("id:'parts',label:'Parts Workshop',district:'parts_workshop'"),
 'Pro must have an enterable Parts Workshop')
assert(world.includes('<FileFolderProBuildConsole')&&world.includes('data-pro-textured-scene="interactive"'),
 'Pro build tools must be inside the real touch-controlled world')
assert(world.includes('applied_parts')&&world.includes('buildFormationProgress(b,now)'),
 'Visible construction progress and attached parts must come from server records')
assert(world.includes('CityMaterial')&&material.includes('city-material-atlas.png')&&material.includes('bumpMap={surfaces.relief}'),
 'Physical Pro buildings must carry WEAVE textured materials')
assert(!world.includes('CJ_DORADO_FILE_NUMBER')&&!world.includes("name:'Crypto Exchange'"),
 'Every Pro owner forms their own approved center business')
assert(engine.includes('onAction={act} busy={Boolean(busy)}')&&
 engine.includes('blueprints={Array.isArray(world?.blueprints)?world.blueprints:[]}')&&
 engine.includes('inventory={Array.isArray(world?.inventory)?world.inventory:[]}')&&
 engine.includes('buildFunding={world?.buildFunding}'),
 'Pro receives authorized action dispatcher and live inventory, not demo data')
assert(consoleSource.includes('quoteFileFolderBlueprint(selectedPlan,')&&
 consoleSource.includes('planQuote.materialMissing')&&
 consoleSource.includes('planQuote.acquireCost')&&
 consoleSource.includes("action:'purchase_item'")&&consoleSource.includes("action:'start_build'"),
 'Building Plan must present verified costs, buy missing materials and start a recorded build')
assert(consoleSource.includes('isBuildPartCompatible(')&&
 consoleSource.includes("action:'apply_build_item'")&&
 consoleSource.includes('(owned.get(item.item_key)||0)<1'),
 'Part installation requires compatible builds and an actually owned part')
assert(consoleSource.includes("view==='speed'")&&consoleSource.includes("item.build_effect==='speed_boost'")&&
 consoleSource.includes('selectedBuild?.speed_multiplier'),
 'Speed Bay must display the actual recorded speed and available boosters')
assert(consoleSource.includes("buildFormationProgress(selectedBuild,now)")&&
 consoleSource.includes('selectedBuild.completes_at'),
 'Pro must use recorded finish time, never a fabricated timer')
assert(consoleSource.includes('Install on build')&&consoleSource.includes('Buying a booster alone does not change construction time'),
 'Only a confirmed installation accelerates the selected real build')
assert(api.includes("action === 'apply_build_item'")&&api.includes("effectType === 'speed_boost'")&&
 api.includes('quantity=quantity-1')&&api.includes('completes_at=CASE'),
 'Shared server must atomically consume owned parts and change the build schedule')
assert(proApi.includes("export {GET,POST} from '@/app/api/client/file-folder-world/route'")&&
 api.includes("getActiveProRegionalManager(request)"),
 'All Pro action writes must remain under verified Pro owner authorization')
assert(consoleSource.includes('gate&&')&&consoleSource.includes('disabled={busy||gate||planQuote.materialMissing>0}'),
 'A funding gate or missing kits must block new construction in Pro UI')
console.log('Pro building plans, textured construction, compatible parts and server-verified Speed Bay: source contracts passed')
