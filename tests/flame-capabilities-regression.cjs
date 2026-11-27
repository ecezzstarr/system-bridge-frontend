const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript')
const e={},read=p=>fs.readFileSync(p,'utf8')
vm.runInNewContext(ts.transpileModule(read('lib/flame-capabilities.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:e})
for(const role of ['admin','bridger','agent','client','legion']){
 const a=e.flameCapabilities(role,false,{image:false,text:false}).actions
 assert.equal(a.find(x=>x.id==='web').available,false)
 assert.equal(a.find(x=>x.id==='creative').available,false)
 assert.equal(a.some(x=>x.id==='claim'),role==='bridger')
 assert.equal(a.some(x=>x.id==='release'),role==='admin')
 assert.equal(a.some(x=>x.id==='folder'),role==='client')
}
assert.equal(e.flameCapabilities('visitor',true,{image:true,text:true}).actions.length,0)
assert.equal(e.flameCapabilities('agent',true,{image:true,text:false}).actions.find(x=>x.id==='creative').available,true)
const ui=read('components/personal-flame.tsx')
assert(ui.includes('previewOnly:true')&&ui.includes('Confirm operation')&&ui.includes('if(!preview||busy||executionRef.current)return'))
assert(read('app/api/personal-flame/route.ts').includes('flameCapabilities(user.role'))
console.log('Flame capability isolation and operation preview contract passed')
