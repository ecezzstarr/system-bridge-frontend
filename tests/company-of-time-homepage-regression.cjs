const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')

const source=fs.readFileSync(path.join(__dirname,'../app/page.tsx'),'utf8')
const required=[
  'The Company of Time',
  'Interaction in Motion presents',
  'The Weave of Presence: System Switch — Bridge of Radiance',
  'Stability',
  'Hope',
  'A Time',
  'Dream',
  'The company through the people of its departments',
  'Company Loop 1 — Flame Event: Burning River',
  'Company Loop 2 — Country Event: One Nigeria',
  'data-home-plus-file-folder="official-picture"',
  'plus-file-folder-white-official.webp',
  'What WEAVE Builds',
  'Technology and systems formed around movement already present in human life.',
  'Client Access Point',
  'Already a WEAVE Client?',
  'href="/client/login"',
  'href="/client/register"',
  'Enter WEAVE as staff',
  'registration: \'/register?role=agent\'',
  'registration: \'/register?role=bridger\'',
  'enter: \'/login?portal=admin\'',
  'data-home-farm-to-family',
  'AI has a place inside participation',
  'data-weave-public-entry-world="true"',
]
for(const phrase of required)assert.ok(source.includes(phrase),'Homepage missing: '+phrase)
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

console.log('The Company of Time homepage source checks passed')
