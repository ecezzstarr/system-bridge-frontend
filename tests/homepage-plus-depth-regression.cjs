const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname,'..')
const read = file => fs.readFileSync(path.join(root,file),'utf8')
const home = read('app/page.tsx')
const layout = read('app/layout.tsx')
const styles = read('app/weave-home-plus-depth.css')
const existing = read('app/weave-expression.css')

const expressionIndex = layout.indexOf("import './weave-expression.css'")
const depthIndex = layout.indexOf("import './weave-home-plus-depth.css'")
assert(expressionIndex !== -1 && depthIndex > expressionIndex,
  'The home-only Plus depth stylesheet must load after old homepage overrides.')
assert(styles.includes('html[data-weave-shell-theme="plus-white-gold"] [data-public-weave-world]'),
  'The new theme must be scoped to the Plus homepage.')
assert(!styles.includes('[data-flame-event-location] '),
  'Home decoration must not paint over the standalone Flame Event.')
for(const station of [
 '.weave-home-nav','.weave-home-hero','.weave-home-plus-world',
 '.weave-home-work-section','.weave-home-reach',
 '.weave-home-reach-tracking','.weave-home-agent-application',
 '.weave-home-presence-signature','.weave-home-staff',
 '.weave-home-participation','.weave-home-ai','.weave-home-footer'
]){
 assert(styles.includes(station),station+' must have authored Plus styling.')
}
for(const station of [
 'data-company-of-time','data-home-plus-file-folder','data-home-what-weave-builds',
 'data-home-client-access','data-weave-presence-signature','data-home-staff-entry',
 'data-home-farm-to-family','data-ai-participation'
]){
 assert(home.includes(station),'Preserve existing homepage content station '+station)
}
assert(home.includes('data-home-plus-readable-explanation="true"'),
 'Plus tier is explained with selectable readable copy, not only a scaled image.')
assert(home.includes('weave-home-plus-facts')&&home.includes('Customer Door'),
 'Business services remain intelligible when the poster is small on a phone.')
assert(home.includes('/weave/plus-file-folder-white-official.webp'),
 'The approved Plus poster remains intact.')
assert(home.includes('/weave-food/weave-family-products.avif'),
 'The real Family Food photo remains intact.')
for(const feature of ['Agents','Bridgers','Clients','Administrations']){
 assert(home.includes(feature),'Keep named individual company roles and responsibilities: '+feature)
}
assert(styles.includes('font-size: clamp(.975rem'), 'Long-form company copy must use a phone-friendly size.')
assert(styles.includes('background: #ffffff !important;'),
 'Real form fields must be opaque and legible on the Plus surface.')
assert(existing.includes('.weave-home-footer'), 'Existing global homepage contract is retained.')
console.log('PASS: One grounded Plus homepage from hero to footer, no hidden role copy or replaced poster.')
