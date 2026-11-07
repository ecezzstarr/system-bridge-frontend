const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')
const root=path.resolve(__dirname,'..')
const sourceExtensions=new Set(['.ts','.tsx','.js','.jsx','.md','.html','.css','.json'])
const roots=['app','components','lib','docs','selfhost']
const matches=[]
function inspect(p){
 const full=path.join(root,p)
 const stat=fs.statSync(full)
 if(stat.isDirectory()){
   for(const item of fs.readdirSync(full)){
     if(['node_modules','.next','dist','build','migrations','generated'].includes(item))continue
     inspect(path.join(p,item))
   }
   return
 }
 if(!sourceExtensions.has(path.extname(p)))return
 const contents=fs.readFileSync(full,'utf8')
 if(contents.includes('Administration')){
   const lines=contents.split(/\r?\n/)
   lines.forEach((line,index)=>{
     // Department is officially Administrations, not singular Administration.
     // Do not rename lowercase internal /admin URLs, database identifiers,
     // generic tasks (e.g. system administration), or historical migrations.
     if(/\bAdministration\b/.test(line))
       matches.push(p+':'+(index+1)+': '+line.trim().slice(0,150))
   })
 }
}
for(const dir of roots)inspect(dir)
inspect('PRODUCTION.md')
assert.deepStrictEqual(matches,[], 'Public-facing WEAVE department must be called Administrations everywhere in current source; remaining singular labels:\n'+matches.slice(0,70).join('\n'))
const writing=fs.readFileSync(path.join(root,'lib/weave-writing.ts'),'utf8')
const home=fs.readFileSync(path.join(root,'app/page.tsx'),'utf8')
const admin=fs.readFileSync(path.join(root,'lib/admin-workplace-catalog.ts'),'utf8')
assert(writing.includes("'Administrations'"),'Weave writing vocabulary should use Administrations')
assert(home.includes("name: 'Administrations'"),'Home roles should say Administrations')
assert(admin.includes('Administrations World'),'Workplace links should carry the department name')
assert(fs.existsSync(path.join(root,'app/api/admin/users/route.ts')),'Preserve the stable /admin API namespace')
console.log('PASS: Administrations is the company department across pages, shared copy, API messages and documentation without changing /admin identifiers')
