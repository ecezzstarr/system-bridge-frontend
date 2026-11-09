const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')

const read=(file)=>fs.readFileSync(path.join(__dirname,'..',file),'utf8')
const source=read('lib/weave-visual-theme.ts')
const exportsFromModule={}
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
new Function('exports','require',js)(exportsFromModule,require)
const {weaveVisualThemeForPath}=exportsFromModule

for(const route of [
  '/event','/event/live','/flame-event','/flame-event/preview',
  '/client/event','/admin/flame-event',
  '/system-switch/flame-event','/client/system-switch/flame-event',
]){
  assert.equal(weaveVisualThemeForPath(route),'flame-event-original',route)
}
for(const route of [
  '/','/login','/register','/client/login','/client/register',
  '/admin/dashboard','/agent/presence','/bridger/dashboard',
  '/client/dashboard','/client/system-switch','/system-switch',
  '/admin/file-folder-world-releases','/company/loops',
]){
  assert.equal(weaveVisualThemeForPath(route),'plus-white-gold',route)
}
assert.equal(weaveVisualThemeForPath('/eventual'),'plus-white-gold')
assert.equal(weaveVisualThemeForPath('/client/event?ticket=1'),'flame-event-original')

const layout=read('app/layout.tsx')
const component=read('components/world/weave-global-visual-theme.tsx')
const css=read('app/weave-plus-company-theme.css')
const presets=read('lib/file-folder-world-presets.ts')
assert.match(layout,/data-weave-shell-theme="plus-white-gold"/)
assert.match(layout,/import '.\/weave-plus-company-theme.css'/)
assert.match(layout,/<WeaveGlobalVisualTheme\s*\/>/)
assert.match(component,/usePathname/)
assert.match(component,/weaveVisualThemeForPath\(pathname\)/)
assert.match(css,/data-weave-shell-theme="plus-white-gold"/)
assert.match(css,/:not\(:has\(\[data-flame-event-location\]/)
assert.match(css,/--primary: #845b24;/)
const finishing=read('app/weave-plus-company-pages.css')
assert.ok(layout.includes("import './weave-plus-company-pages.css'"))
assert.match(finishing,/data-weave-shell-theme="plus-white-gold"/)
assert.match(finishing,/\[class\*="bg-slate-800"\]/)
assert.match(finishing,/\[class\*="bg-black\/"\]/)
assert.match(finishing,/text-shadow: none !important/)
assert.match(finishing,/overflow-wrap: anywhere/)
assert.match(finishing,/\[data-public-weave-world\]/)
const postcss=require('postcss')
postcss.parse(css,{from:'app/weave-plus-company-theme.css'})
postcss.parse(finishing,{from:'app/weave-plus-company-pages.css'})

// Every real Next.js page is classified by the same route-aware source.
// The atlas and seven Flame Event pages have their own visual identity.
function visit(dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>{
    const file=path.join(dir,item.name)
    return item.isDirectory()?visit(file):item.name==='page.tsx'?[file]:[]
  })
}
const pages=visit(path.join(__dirname,'..','app'))
const resolveRoute=file=>{
  const relative=path.relative(path.join(__dirname,'..','app'),file).replaceAll('\\','/')
  const route=relative.replace(/\/page\.tsx$/,'').replace(/^page\.tsx$/,'').split('/')
    .filter(part=>part&&!/^\([^)]*\)$/.test(part)).join('/')
  return '/'+route
}
const allRoutes=[...new Set(pages.map(resolveRoute))]
assert.ok(allRoutes.length>=210,'Company-wide layout must serve at least 210 page routes')
const expectedFlame=new Set([
  '/event','/flame-event','/flame-event/world','/client/event',
  '/admin/flame-event','/system-switch/flame-event','/client/system-switch/flame-event',
])
const actualFlame=new Set()
for(const route of allRoutes) {
  const theme=weaveVisualThemeForPath(route)
  assert.equal(theme,route==='/system-switch/world'?'open-world-atlas':expectedFlame.has(route)?'flame-event-original':'plus-white-gold',route)
  if(theme==='flame-event-original')actualFlame.add(route)
}
assert.deepEqual([...actualFlame].sort(),[...expectedFlame].sort(),
  'Burning River exclusions must not spread into ordinary company pages')

// White typography on gold buttons meets WCAG AA normal-text contrast.
const luminance=hex=>{
  const rgb=hex.replace('#','').match(/.{2}/g).map(v=>parseInt(v,16)/255)
  return rgb.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4)
    .reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)
}
const contrast=(a,b)=>{
  const [bright,dark]=[luminance(a),luminance(b)].sort((a,b)=>b-a)
  return (bright+.05)/(dark+.05)
}
assert.ok(contrast('#845b24','#ffffff')>=4.5,'Gold button labels need 4.5:1 contrast')
assert.ok(contrast('#253f52','#f7f9fc')>=4.5,'Body text needs 4.5:1 contrast')
assert.ok(contrast('#637688','#ffffff')>=4.5,'Input placeholders need 4.5:1 contrast')

assert.match(css,/#f7f9fc/)
assert.match(presets,/plus:\{theme:'plus-white-gold'/)
assert.match(presets,/standard:\{theme:'standard-living-valley'/)
assert.match(presets,/premium:\{theme:'ember-gold'/)
console.log('Plus theme: '+allRoutes.length+' company routes, '+actualFlame.size+' Flame Event exemptions, CSS syntax and contrast: OK')
