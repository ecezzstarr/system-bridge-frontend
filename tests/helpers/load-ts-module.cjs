const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const root=path.resolve(__dirname,'../..')
const cache=new Map()
function load(file){
  const absolute=path.resolve(root,file)
  if(cache.has(absolute))return cache.get(absolute)
  const exported={}
  cache.set(absolute,exported)
  const source=ts.transpileModule(fs.readFileSync(absolute,'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
  }).outputText
  const req=id=>{
    if(id.startsWith('@/'))return load(id.slice(2)+'.ts')
    if(id.startsWith('.'))return load(path.resolve(path.dirname(absolute),id)+(path.extname(id)?'':'.ts'))
    return require(id)
  }
  new Function('exports','require',source)(exported,req)
  return exported
}
module.exports=load
