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
assert.match(css,/#a9782d/)
assert.match(css,/#f7f9fc/)
assert.match(presets,/plus:\{theme:'plus-white-gold'/)
assert.match(presets,/standard:\{theme:'standard-living-valley'/)
assert.match(presets,/premium:\{theme:'ember-gold'/)
console.log('Plus company visual theme and Flame Event route isolation: OK')
