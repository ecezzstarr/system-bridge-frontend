const fs=require('node:fs')
const path=require('node:path')
const vm=require('node:vm')
const assert=require('node:assert/strict')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=file=>fs.readFileSync(path.join(root,file),'utf8')

const scriptFile=read('lib/weave-narration-script.ts')
const transpiled=ts.transpileModule(scriptFile,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const sandbox={exports:{},module:{exports:{}}}
sandbox.exports=sandbox.module.exports
vm.runInNewContext(transpiled,sandbox)
const make=sandbox.module.exports.formOriginalScriptScenes
assert.equal(typeof make,'function')

const exact="As Moses led his people to the promise land I say unto all of you solemnly that time isn't moving but still and we're the one's moving slowly with our meanings. What if Weave leading us to the promise land is not us traveling but us still and watching our lives change due Weave's events that carry participation?"
const scenes=make(exact,120)
assert.ok(scenes.length>1&&scenes.length<=24)
assert.equal(scenes.reduce((sum,scene)=>sum+scene.durationSeconds,0),120)
assert.equal(scenes.map(s=>s.voiceover).join(' '),exact)
assert.ok(scenes.every(s=>s.text.length<=110),'captions fit mobile screen')
assert.throws(()=>make(exact+' '+exact,30),/at least/)
assert.throws(()=>make(' ',90),/original narration/)
assert.throws(()=>make(exact,500),/30 seconds/)

const api=read('app/api/admin/video-ads/route.ts')
const schema=read('lib/video-ad-workshop.ts')
const render=read('app/api/admin/video-ads/render/route.ts')
const admin=read('app/(app)/admin/video-ad-workshop/page.tsx')
const ownedEditor=read('app/api/video-ad-studio/project/route.ts')
const participant=read('components/video-studio/participant-production-editor.tsx')
const mic=read('components/video-studio/narration-capture.tsx')
const voice=read('app/api/admin/video-ads/narration/route.ts')

assert.ok(api.includes('formOriginalScriptScenes')&&api.includes('narrationScript'),'exact user script is saved, not sent to promotional copy generator')
assert.ok(schema.includes('narration_script text')&&schema.includes('narration_url text'),'story and voice persist separately')
assert.ok(render.includes('amix=inputs=2')&&render.includes("narrationUrl ? '0.16' : '0.80'"),'narration priority over quieter music')
assert.ok(render.includes('probeNarrationSeconds')&&render.includes('will not cut off your words'),'audio never truncates silently')
assert.ok(admin.includes('WeaveNarrationCapture')&&admin.includes('scriptText'),'administration can create an audiobook episode and capture spoken audio')
assert.ok(participant.includes('WeaveNarrationCapture')&&participant.includes('RENDER MP4'),'paid participants can finish their own narrated videos')
assert.ok(ownedEditor.includes('created_by=$2::uuid')&&ownedEditor.includes('o.price_flame_coin>=0'),'participants edit only their own paid projects')
assert.ok(mic.includes('getUserMedia')&&mic.includes('MediaRecorder'),'browser microphone records directly to WEAVE storage')
assert.ok(voice.includes('WEAVE_PIPER_MODEL')&&voice.includes('voice.enabled'),'local voice model is optional and never falsely claimed as ready')
console.log('WEAVE original-script video and narration regression checks passed')
