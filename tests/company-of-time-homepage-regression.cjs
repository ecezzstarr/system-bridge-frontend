const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const source=fs.readFileSync(path.join(__dirname,'../app/page.tsx'),'utf8')
const required=[
  'The Company of Time',
  'Interaction in Motion presents',
  'The Weave of Presence',
  'System Switch — Bridge of Radiance',
  'Stability',
  'Hope',
  'A Time',
  'Dream',
  'One company. Many people. Work moving through time.',
  'Company Loop 1 · Flame Event',
  'Burning River',
  'Company Loop 2 · Country Event',
  'Country Formation',
  'Company Loop 3 · Individual Event',
  'Self Upliftment',
  'data-home-plus-file-folder="official-picture"',
  'plus-file-folder-white-official.webp',
  'What WEAVE Builds',
  'From the work you know to the business you envision.',
  'Client Access Point',
  'Already a WEAVE Client?',
  'href="/client/login"',
  'href="/client/register"',
  'Find your place in the company.',
  "registration: '/register?role=agent'",
  "registration: '/register?role=bridger'",
  "enter: '/login?portal=admin'",
  'data-home-farm-to-family',
  'AI has a place inside participation',
  'data-weave-public-entry-world="true"',
]
for(const phrase of required)assert.ok(source.includes(phrase),'Homepage missing: '+phrase)
assert.ok(source.includes('data-home-company-worldwide="true"'),'Homepage must explain WEAVE across borders')
assert.ok(source.includes('Across borders'),'Homepage must present WEAVE as globally oriented')

// The Country Formation heading belongs exclusively to Loop 2. Keep its
// identity separate from Loop 3 and preserve country-neutral homepage copy.
const loopTwoStart=source.indexOf('weave-home-loop-country')
const loopThreeStart=source.indexOf('weave-home-loop-time')
assert.ok(loopTwoStart>=0 && loopThreeStart>loopTwoStart,'Keep distinct Loop 2 and Loop 3 sections')
const loopTwoCopy=source.slice(loopTwoStart,loopThreeStart)
assert.match(loopTwoCopy,/Country Formation/,'Loop 2 keeps its official country event identity')
const outsideLoopTwo=source.slice(0,loopTwoStart)+source.slice(loopThreeStart)
assert.doesNotMatch(outsideLoopTwo,/\bNigeria(?:n)?\b/i,
  'Homepage must not use Nigeria/Nigerian outside Company Loop 2')
for(const component of [
  'components/reach-delivery/public-request-form.tsx',
  'components/reach-delivery/request-tracker.tsx',
  'components/weave-logo.tsx',
]){
  const text=fs.readFileSync(path.join(__dirname,'..',component),'utf8')
  assert.doesNotMatch(text,/\bNigeria(?:n)?\b/i,
    'Visible homepage component must remain country-neutral: '+component)
}

const order=[
  'data-company-of-time="introduction"',
  'data-home-plus-file-folder="official-picture"',
  'data-home-what-weave-builds',
  'data-home-client-access',
  'data-home-staff-entry',
]
let last=-1
for(const marker of order){
 const next=source.indexOf(marker)
 assert.ok(next>last,'Homepage section order incorrect: '+marker)
 last=next
}
assert.ok(!source.includes('<ProFileFolderPreview'),'Homepage presents Plus poster, not Pro product preview')
assert.ok(!source.includes('visitor avatar'),'Homepage should not advertise a humanoid visitor avatar')
const crypto=require('node:crypto')
const poster=fs.readFileSync(path.join(__dirname,'../public/weave/plus-file-folder-white-official.webp'))
assert.equal(crypto.createHash('sha256').update(poster).digest('hex'),
 'f35abcf28c07a47b751a76397b1863873db4d189533bcae9a48716c813a8fea5',
 'Homepage must include the verified optimized version of 389215.png, not a substitute')

// The Company of Time is typography within one Plus-inspired river landscape,
// not a sequence of opaque bordered cards. Existing product artwork is untouched.
const theme=fs.readFileSync(path.join(__dirname,'../app/weave-home-burning-river.css'),'utf8')
const layout=fs.readFileSync(path.join(__dirname,'../app/layout.tsx'),'utf8')
for(const marker of [
  'weave-public-home',
  'weave-home-hero',
  'weave-home-departments',
  'weave-home-plus-world',
  'weave-home-plus-image',
  'weave-home-work-section',
  'weave-home-staff-position',
  'weave-home-participation',
])assert.ok(source.includes(marker),'Homepage world composition missing: '+marker)
assert.ok(!source.includes('bg-[#061427]/75'),'Homepage must not restore dark-blue enclosing cards')
assert.ok(!source.includes('rounded-[1.4rem]'),'Homepage must not nest section cards')
assert.ok(theme.includes('[data-public-weave-world] .weave-home-plus-image'),
  'Approved Plus artwork must remain fully visible')
assert.ok(theme.includes('background: transparent')&&theme.includes('border-radius: 0'),
  'Homepage lettering and entrances should sit on the living world rather than opaque cards')
assert.ok(theme.includes("url('/weave/home-burning-river-theme.svg')"),
  'Keep approved river-blue and light-fire identity in the background')
assert.ok(theme.includes('@media (max-width: 680px)'),'Homepage must have narrow-phone layout')
assert.ok(theme.includes('prefers-reduced-motion'),'Homepage must respect reduced motion')
assert.ok(theme.includes('one-nigerian'),'Homepage must preserve the following company loop')
assert.ok(layout.includes("import './weave-home-burning-river.css'"),
  'Page-specific landscape CSS must load after the shared theme')

// Scroll surfaces belong to Plus porcelain rather than old navy/black panels.
// The correction is homepage-scoped; Flame Event keeps its own atmosphere.
const finish=fs.readFileSync(path.join(__dirname,'../app/weave-expression.css'),'utf8')
assert.ok(finish.includes('Homepage scroll continuity.'),'Keep the dedicated light scroll treatment')
assert.ok(finish.includes(':has([data-public-weave-world]) body'),'Avoid navy overscroll behind home')
assert.ok(finish.includes('[data-public-weave-world] .weave-home-nav'),'Navigation needs a light surface')
assert.ok(finish.includes('[data-public-weave-world] .weave-home-footer'),'Footer needs a light surface')
assert.ok(finish.includes('.weave-home-reach,.weave-home-reach-tracking'),
  'The public Reach flow must keep matching light form controls')
assert.ok(finish.includes('background: #fff;'),'Reach input fields need a white reading surface')
assert.ok(!finish.includes('[data-flame-event-location] .weave-home-nav'),
  'Never apply the homepage styling to the separate Flame Event')
assert.ok(layout.includes("import './weave-expression.css'"),
  'Premium home finishing rules must load after the original homepage skin')

console.log('The Company of Time homepage source checks passed')
