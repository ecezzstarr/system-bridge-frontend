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
  'A Cat',
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

console.log('The Company of Time homepage source checks passed')
