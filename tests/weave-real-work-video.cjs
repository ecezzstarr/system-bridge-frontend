const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const files=[
  'lib/weave-work-demo-video.ts',
  'lib/weave-video-real-texture.ts',
  'lib/video-ad-workshop.ts',
  'components/video-studio/participant-production-editor.tsx',
  'app/(app)/video-ad-studio/page.tsx',
  'app/(app)/admin/video-ad-workshop/page.tsx',
  'app/api/video-ad-studio/project/route.ts',
  'app/api/admin/video-ads/route.ts',
  'app/api/admin/video-ads/render/route.ts',
]
for(const file of files){
  const parsed=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
  assert.equal(parsed.parseDiagnostics.length,0,file+' should parse as valid TypeScript')
}
function importPure(source,mocks={}){
  const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}})
  const module={exports:{}}
  new Function('module','exports','require',compiled.outputText)(module,module.exports,(key)=>{
    if(key in mocks)return mocks[key]
    throw Error('Unexpected import '+key)
  })
  return module.exports
}
const priceSource=read('lib/agility-catalog.ts')
const constant=name=>{
  const match=priceSource.match(new RegExp('export const '+name+' = (\\d+)'))
  assert(match,'Price must originate from the actual WEAVE food catalog')
  return Number(match[1])
}
const engine=importPure(read(files[0]),{
  '@/lib/agility-catalog':{
    AGILITY_AGENT_BOX_PRICE_NGN:constant('AGILITY_AGENT_BOX_PRICE_NGN'),
    AGILITY_PACKAGES_PER_BOX:constant('AGILITY_PACKAGES_PER_BOX'),
    AGILITY_RETAIL_UNIT_PRICE_NGN:constant('AGILITY_RETAIL_UNIT_PRICE_NGN'),
  },
})
assert.equal(engine.WEAVE_WORK_DEMOS.length,3)
const cfg={kind:'agent-agility',quantity:1,examplePriceNgn:15000,look:'documentary'}
const q=engine.quoteWorkDemo(cfg)
assert.equal(q.units,10)
assert.equal(q.stockCost,30000)
assert.equal(q.revenue,40000)
assert.equal(q.grossMargin,10000)
assert(q.note.includes('Unsold stock')&&q.note.includes('No income is guaranteed'))
const slots=Array.from({length:6},(_,i)=>({
  id:'scene-'+(i+1),order:i+1,durationSeconds:5,beat:'OLD',text:'Original',visualDirection:'',voiceover:'',
  assetUrl:i===0?'/media/owned.png':null,assetType:i===0?'image':null,
}))
const changed=engine.buildWeaveWorkDemoScenes(slots,cfg)
assert.equal(changed.length,6)
assert.equal(changed.reduce((sum,item)=>sum+item.durationSeconds,0),30)
assert.equal(changed[0].assetUrl,slots[0].assetUrl,'Existing paid producer media survives storyboard update')
assert(changed.every(item=>item.visualStyle==='documentary'))
assert(changed.every(item=>item.visualDirection.length>15),'Each scene tells producer what to actually film')
assert(changed.some(item=>item.text.includes('₦10,000')),'Example shows calculated gross margin')
const bridger=engine.quoteWorkDemo({kind:'bridger-outreach',quantity:2,examplePriceNgn:10000,look:'cinematic'})
assert.equal(bridger.grossMargin,null)
assert(bridger.note.includes('not earned funds'))
const client=engine.buildWeaveWorkDemoScenes(slots,{kind:'client-customer-door',quantity:1,examplePriceNgn:25000,look:'natural'})
assert(client.some(scene=>scene.text.includes('₦25,000')))
assert(client.some(scene=>scene.visualDirection.includes('fictional')),'Customer examples must remain labelled')
const texture=importPure(read(files[1]))
for(const look of ['natural','documentary','cinematic']){
 const rendered=texture.weaveRealTextureFilter({assetType:'video',visualStyle:look,durationSeconds:5,fontPath:'/tmp/font.ttf',textPath:'/tmp/caption.txt',demoMode:true})
 assert(rendered.includes('SIMULATION - NOT ACTUAL EARNINGS'))
 assert(rendered.includes('crop=720:1280'))
 assert(rendered.includes('drawtext=fontfile='))
 assert(rendered.includes('fade=t=out:st=4.76'))
}
const still=texture.weaveRealTextureFilter({assetType:'image',visualStyle:'cinematic',durationSeconds:5,fontPath:'/tmp/font.ttf',textPath:'/tmp/caption.txt',demoMode:false})
assert(still.includes('zoompan='),'Photography has actual optical movement, not static mock cards')
assert(still.includes('vignette='),'Cinematic texture modifies original pixels')
assert(!still.includes('SIMULATION - NOT ACTUAL EARNINGS'))
const project=read(files[2]),editor=read(files[3]),admin=read(files[5]),participantApi=read(files[6]),adminApi=read(files[7]),renderer=read(files[8])
assert(project.includes('demo_mode boolean NOT NULL DEFAULT false'))
assert(project.includes('ALTER TABLE admin_video_ad_projects ADD COLUMN IF NOT EXISTS demo_mode'))
assert(project.includes('demoMode: Boolean(row.demo_mode)'))
assert(editor.includes('buildWeaveWorkDemoScenes')&&admin.includes('buildWeaveWorkDemoScenes'))
assert(editor.includes('capture="environment"')&&admin.includes('capture="environment"'))
assert(editor.includes('onClick={applyDemo}')&&admin.includes('onClick={applyWorkDemo}'))
assert(editor.includes('demoMode:Boolean(next.demoMode)')&&admin.includes('demoMode:Boolean(next.demoMode)'))
assert(participantApi.includes('demo_mode=CASE WHEN $6::boolean THEN true ELSE demo_mode END'),'Participant cannot clear simulation disclaimer')
assert(adminApi.includes('demo_mode=CASE WHEN $5::boolean THEN true ELSE demo_mode END'),'Admin cannot clear simulation disclaimer in project update')
assert(renderer.includes('weaveRealTextureFilter({')&&renderer.includes('demoMode: Boolean(row.demo_mode)'),'All demo exports receive watermark on the server')
assert(renderer.includes('if (!paid.rows[0])'),'Existing paid-producer authorization remains')
assert(renderer.includes("downloadAsset(scene.assetUrl!, inputPath)"),'Actual owned assets are rendered, not fake mockups')
assert(read('app/(app)/video-ad-studio/page.tsx').includes('data-weave-video-real-texture'))
console.log('PASS: real-work Weave video maker, 3 role workflows, catalog-based Agility margins, actual camera/media, on-device scene plans, textured FFmpeg footage, safe income labels and paid studio gate')
