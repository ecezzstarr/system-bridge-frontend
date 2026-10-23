const assert=require('node:assert/strict')
const path=require('node:path')
const fs=require('node:fs')
// Release must contain the founder's EXACT approved images, not merely
// JSX references with a hidden fallback or unrelated generic art.
const crypto=require('node:crypto')
const approvedArt=[
  ['public/weave/flame-event/burning-river-crossing-official.webp',
   'f032c305f89519df5c7c5156bbf02ee62fef46fe1030fe39dd983118f3074f50'],
  ['public/weave/flame-event/burning-river-open-world-official.webp',
   'c72c1ba20c3436cb0e808b3523080a9928e5901f694db5adc9b0b8a5d5f3ba99'],
]
for(const [asset,expectedSha] of approvedArt){
  const filepath=path.join(__dirname,'..',asset)
  assert.ok(fs.existsSync(filepath),
    'Cannot release Flame Event until exact official approved artwork is installed: '+asset)
  const data=fs.readFileSync(filepath)
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'),expectedSha,
    'The official artwork must not be replaced by an unapproved image: '+asset)
}

console.log('PASS: founder-approved Flame Event artwork and open-world reference verified by hash')
