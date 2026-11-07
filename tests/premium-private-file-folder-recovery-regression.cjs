const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const originalFiles=[
  'lib/client-file-folder-tier.ts',
  'lib/file-folder-kingdom-identity.ts',
  'app/api/client/file-folder-entry/route.ts',
  'app/api/client/system-switch/route.ts',
  'app/client/system-switch/page.tsx',
  'components/system-switch/file-folder-premium-world.tsx',
  'components/system-switch/client-file-folder-operating-environment.tsx',
  'app/api/admin/file-folder-health/route.ts',
  'app/(app)/admin/file-folder-health/page.tsx',
]
for(const file of originalFiles){
  const result=ts.transpileModule(read(file),{
    fileName:file,reportDiagnostics:true,
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},
  })
  assert.equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,
    'Invalid TypeScript/TSX in '+file)
}
function compile(file,deps={}){
  const output={}
  const js=ts.transpileModule(read(file),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText
  vm.runInNewContext(js,{
    exports:output,
    require:source=>{
      if(source in deps)return deps[source]
      throw Error('Unexpected module '+source)
    },
    process:{env:{}},Number,Math,Set,Map,
  },{filename:file})
  return output
}
const pricing=compile('lib/file-folder-pricing.ts')
const mock={upgrade:null,activation:null}
const tier=compile('lib/client-file-folder-tier.ts',{
  '@/lib/file-folder-pricing':pricing,
  '@/lib/client-folder-upgrade':{getClientFolderUpgrade:async()=>mock.upgrade},
  '@/lib/pro-file-folder-activation':{getProActivationState:async()=>mock.activation},
})
const premium={status:'folder_issued',file_folder_tier:'premium',amount_trx:35800}
assert.equal(tier.verifiedFileFolderPurchaseTier(premium),'premium','Issued Premium purchase remains Premium')
assert.equal(tier.verifiedFileFolderPurchaseTier({...premium,status:'pending'}),null,'Unverified Premium does not unlock')
assert.equal(tier.verifiedFileFolderPurchaseTier({...premium,amount_trx:2500}),null,'Incorrect price does not unlock Premium')
assert.equal(tier.verifiedFileFolderPurchaseTier({status:'confirmed',file_folder_tier:'plus',amount_trx:59602,payment_method:'trx'}),'plus')
assert.equal(tier.verifiedFileFolderPurchaseTier({status:'approved',file_folder_tier:'plus',amount_usdt:20000,payment_method:'usdt'}),'plus')
assert.equal(tier.verifiedFileFolderPurchaseTier({status:'folder_issued',file_folder_tier:'plus',amount_usdt:20000,payment_method:'usdt'}),null,
  'High-value Plus requires independently confirmed payment')
assert.equal(tier.higherVerifiedFileFolderTier('premium','pro'),'premium','Pro activation may not downgrade Premium')
assert.equal(tier.higherVerifiedFileFolderTier('plus','premium'),'plus','Lower tier may not downgrade Plus')

function ownerSql(input={}){
  const state={purchases:[],deposits:[],grants:[],domain:null,...input}
  return async(strings,...values)=>{
    const statement=strings.join('?').replace(/\\s+/g,' ')
    if(statement.includes("to_regclass('public.file_folder_purchases')"))
      return [{purchases:'file_folder_purchases',domains:'weave_open_world_domains',
        deposits:'bridge_deposits',staff_offers:'company_client_staff_offers'}]
    if(statement.includes('ALTER TABLE'))return []
    if(statement.includes('FROM file_folder_purchases'))return state.purchases
    if(statement.includes('FROM bridge_deposits'))return state.deposits
    if(statement.includes('FROM company_client_staff_offers'))return state.grants
    if(statement.includes('FROM weave_open_world_domains'))return state.domain?[{tier:state.domain}]:[]
    throw Error('Unexpected SQL '+statement)
  }
}
const input={clientId:'11111111-1111-4111-8111-111111111111',fileNumber:'WEAVE-PREMIUM-OWNER'}
async function verify(){
  mock.upgrade=null
  mock.activation=null
  const higherWithLaterStandard=await tier.resolveVerifiedClientFileFolderTier(ownerSql({
    purchases:[
      {status:'confirmed',file_folder_tier:'standard',amount_trx:2500},
      premium,
    ],
  }),input)
  assert.equal(higherWithLaterStandard,'premium','A newer Standard purchase cannot hide an issued Premium world')
  mock.activation={status:'active'}
  assert.equal(await tier.resolveVerifiedClientFileFolderTier(ownerSql({purchases:[premium]}),input),'premium',
    'Pro activation does not override verified Premium entitlement')
  mock.activation={status:'payment_required'}
  assert.equal(await tier.resolveVerifiedClientFileFolderTier(ownerSql({purchases:[premium]}),input),'premium',
    'Pending Pro enrollment does not revoke an existing Premium world')
  mock.activation=null
  assert.equal(await tier.resolveVerifiedClientFileFolderTier(ownerSql({
    deposits:[{tier_trx:35800}],
  }),input),'premium','Approved premium Bridge deposit retains purchased tier')
  assert.equal(await tier.resolveVerifiedClientFileFolderTier(ownerSql({
    grants:[{folder_tier:'premium'}],
  }),input),'premium','Administrations-approved Premium staff grant is recognized')
  assert.equal(await tier.resolveVerifiedClientFileFolderTier(ownerSql({
    domain:'premium',
  }),input),'premium','Persisted authorized Premium world domain retains the tier')
  mock.upgrade={status:'ready',tier:'plus'}
  assert.equal(await tier.resolveVerifiedClientFileFolderTier(ownerSql({purchases:[premium]}),input),'plus',
    'Verified upgrade may elevate but not reduce a Premium world')
  mock.upgrade={status:'construction',tier:'plus'}
  assert.equal(await tier.resolveVerifiedClientFileFolderTier(ownerSql({purchases:[premium]}),input),'premium',
    'Pending Plus upgrade cannot change the active Premium world')
  mock.upgrade=null
  assert.equal(await tier.resolveVerifiedClientFileFolderTier(ownerSql({}),input),'standard',
    'No verified evidence does not grant Premium')
}
const client=read('app/client/system-switch/page.tsx')
const switchApi=read('app/api/client/system-switch/route.ts')
const entry=read('app/api/client/file-folder-entry/route.ts')
const king=read('lib/file-folder-kingdom-identity.ts')
const premium3d=read('components/system-switch/file-folder-premium-world.tsx')
const operating=read('components/system-switch/client-file-folder-operating-environment.tsx')
const healthApi=read('app/api/admin/file-folder-health/route.ts')
const worldApi=read('app/api/client/file-folder-world/route.ts')
const loginApi=read('app/api/client/weave-login/route.ts')
const healthPage=read('app/(app)/admin/file-folder-health/page.tsx')
const domainStore=read('lib/weave-open-world-store.ts')

assert(client.includes("setPrivateWorkshop(new URLSearchParams(window.location.search).get('view')!=='shared')"),
  'Owned Client opens the private File Folder by default')
assert(client.indexOf('if(!body?.verified')<client.indexOf('setPrivateWorkshop('),
  'Unauthenticated or incomplete worlds never open the private scene')
assert(client.includes('onPrivateWorkshop={()=>setPrivateWorkshop(true)}')&&
  client.includes('data-client-enter-private-file-folder="true"'),
  'Shared visitor world retains an explicit, accessible private entrance')
assert(client.includes('data-client-private-file-folder=')&&
  client.includes('<ClientFileFolderOperatingEnvironment data={data}/>'),
  'Private world enters existing persistent client work without changing its layout')
assert(switchApi.includes('resolveVerifiedClientFileFolderTier')&&king.includes('resolveVerifiedClientFileFolderTier'),
  'Private File Folder and kingdom theme use a single authenticated tier resolver')
assert(switchApi.includes('AND file_number = ${client.file_number}')&&
  switchApi.includes('client_id = ${client.id}::uuid'),
  'Private API requires exact owner and File Number matching')
assert(entry.includes("sameId(folder.file_number, client.file_number)")&&
  entry.includes('sameId(workshop.file_number, client.file_number)'),
  'Entry rejects an active Folder/workshop attached to a mismatched File Number')
assert(entry.includes("existingTier!=='premium'&&existingTier!=='plus'")&&
  switchApi.includes("existingTier!=='premium'&&existingTier!=='plus'"),
  'Pending Pro enrollment cannot close independently verified Premium and Plus')
assert(operating.includes("data-premium-file-folder-entrance=\"official-live-world\"")&&
  operating.includes('<FileFolderPremiumWorld'),
  'Premium tier reaches the dedicated black/gold real private scene')
assert(premium3d.includes('Premium3DRecoveryBoundary')&&
  premium3d.includes('data-premium-3d-recovery="webgl-unavailable"')&&
  premium3d.includes('STATIONS.map(s=><button'),
  'WebGL failure still leaves six working Premium district buttons')
assert(healthApi.includes("user.role!=='admin'")&&
  healthApi.includes('missing_folders')&&healthApi.includes('missing_workshops')&&
  healthApi.includes('mismatched_folders')&&!healthApi.includes('UPDATE client_file_folders'),
  'Administrations-only audit detects ownership drift without silently granting or overwriting records')
assert(domainStore.includes("ARRAY['unclassified','standard','pro','premium','plus']::text[]")&&
  domainStore.includes('THEN EXCLUDED.tier ELSE weave_open_world_domains.tier END')&&
  domainStore.includes('confirmed.file_folder_tier::text)')&&
  domainStore.includes('o.folder_tier::text)'),
  'Shared Open World prevents downgrade from later lower-tier purchases and employee grants')
assert(healthPage.includes('/api/admin/file-folder-health')&&
  read('lib/admin-workplace-catalog.ts').includes('/admin/file-folder-health'),
  'Administrations has an accessible owner integrity check')
assert(worldApi.includes('resolveVerifiedClientFileFolderTier')&&
  worldApi.includes("verifiedTier!=='premium'&&verifiedTier!=='plus'"),
  'All private File Folder read/write operations remain open for verified Premium and Plus owners')
assert(loginApi.includes('resolveVerifiedClientFileFolderTier')&&
  loginApi.includes("entitledTier==='premium'||entitledTier==='plus'"),
  'Premium and Plus owners are not redirected from login by an unrelated Pro enrollment')
verify().then(()=>console.log('PASS: Premium owner entry, all tiers, Pro non-downgrade, private access, WebGL fallback and Administrations integrity')).catch(error=>{console.error(error);process.exitCode=1})
