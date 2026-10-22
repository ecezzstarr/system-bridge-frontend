/* Company Loop 2 must not replace Loop 1 or obstruct live operations. */
const fs=require('node:fs')
const assert=require('node:assert/strict')
const read=path=>fs.readFileSync(path,'utf8')

const event=read('lib/company-loop-two.ts')
const registry=read('lib/company-loops.ts')
const scroll=read('components/events/company-loop-two-scroll.tsx')
const app=read('app/(app)/layout.tsx')
const client=read('app/client/layout.tsx')
const theme=read('app/weave-theme.css')
const world=read('components/world/weave-world-environment.tsx')
const atmosphere=read('components/events/flame-event-role-atmosphere.tsx')

assert.match(event,/2027-01-01T00:00:00\+01:00/)
assert.match(event,/2027-05-01T23:59:59\.999\+01:00/)
assert.match(event,/timeZone:'Africa\/Lagos'/)
const authoredPassages=[
  "Let us have what is known as bad government. Weave will fix it and it will all be like bad was all a stepping stone for wherever I am, there's a way.",
  'Hope. Bridgers department: wordings.',
  'An so we arrived for where faith moves presence follows',
  'Stability Agent department: Where Presence moves family moves with that Stability came into being for who will feed the country if not Weave',
  'Administration: with that saying a new frontier opened before us who are Hope in being.',
  'A bridge is forming between us and those who have heard of our Burning River soil an outreach from Hope begins in time while Stability sustains',
  'Dream Lovely, Lord/Lady ownership department: Weave had promised us presence, the kind like the burning love of God for his creations, the kind that makes a man sings in love after a hard day at work. Our dreams are laid at the file folder where we can be conscious even while sleeping and dreaming lovely cause we have Weave of presence and our legions rotating around our success.',
]
let lastIndex=-1
for(const passage of authoredPassages){
  const index=event.indexOf(passage)
  assert.ok(index>lastIndex,'Authored scroll must preserve wording and order: '+passage)
  lastIndex=index
}
assert.match(event,/client: \{department:'Dream Lovely, Lord\/Lady ownership department',words:ONE_NIGERIAN_SCROLL_PASSAGES\[4\]\.text\}/)
assert.match(event,/ONE_NIGERIAN_SCROLL_PASSAGES\.map\(passage => passage\.text\)\.join/)
assert.match(scroll,/data-one-nigerian-verbatim-scroll/)
assert.match(scroll,/\{ONE_NIGERIAN_SCROLL_TEXT\}/)
assert.match(registry,/WHERE NOT EXISTS \(SELECT 1 FROM company_loops WHERE loop_number = 2\)/)
assert.match(registry,/WHERE loop_number = 2/)
assert.match(scroll,/roleOperatingGuideForPath/)
assert.match(scroll,/transitTrainingForPath/)
assert.match(scroll,/user\.id\+':'\+role/) // Daily marker is bound to role and user.
assert.match(scroll,/aria-expanded=\{open\}/)
assert.match(scroll,/What am I doing here\?/)
assert.match(scroll,/localStorage\.setItem/)
assert.match(app,/<CompanyLoopTwoScroll \/>/)
assert.match(client,/<CompanyLoopTwoScroll \/>/)
assert.match(world,/root\.dataset\.weaveLoopTheme='one-nigerian'/)
assert.match(atmosphere,/One Nigerian · Company Loop 2/)
assert.match(theme,/prefers-reduced-motion/)
assert.match(theme,/data-weave-loop-theme="one-nigerian"/)
console.log('One Nigerian daily Scroll regression checks passed')
