const assert=require('node:assert/strict')
const crypto=require('node:crypto')
const fs=require('node:fs')
const path=require('node:path')
const root=path.join(__dirname,'..')
const read=p=>fs.readFileSync(path.join(root,p),'utf8')
const asset='/weave/file-folder/official/weave-pro-file-folder-official.webp'
const file=path.join(root,'public',asset)
const image=fs.readFileSync(file)
assert.equal(crypto.createHash('sha256').update(image).digest('hex'),
 'dd27f396e02555fae3f33c164c4927e7ee6d0c05103439d2432723a0ace4e76f',
 'The approved Pro artwork must not be replaced with an unrelated illustration')
const header=image.toString('ascii',0,4)
assert.equal(header,'RIFF','The approved image must be an actual WebP asset')
const presets=read('lib/file-folder-world-presets.ts')
const page=read('app/file-folder-preview/page.tsx')
const standalone=read('components/public/pro-file-folder-preview.tsx')
assert(presets.includes('PRO_FILE_FOLDER_REFERENCE')&&presets.includes("posterAssetPath: '"+asset+"'"),
 'The Pro official reference must point to the published image')
assert(page.includes("id: 'pro'")&&page.includes("image: '"+asset+"'")&&
 page.includes("tier.id === 'plus' || tier.id === 'pro'")&&
 page.includes('max-h-[380px] w-full object-contain'),
 'The public Pro tier shows the full poster rather than the small generic module icon')
assert(standalone.includes('PRO_FILE_FOLDER_REFERENCE.posterAssetPath')&&
 standalone.includes('data-public-pro-file-folder-preview="true"'),
 'The public standalone Pro preview displays the same official artwork')
assert(!page.includes("image: '/weave/file-folder/assets/operations-module.svg'"),
 'Retire the generic operations illustration from the official Pro tier preview')
assert(presets.includes("Every verified Standard File Folder owner")&&
 presets.includes("PREMIUM_FILE_FOLDER_REFERENCE")&&presets.includes("PLUS_FILE_FOLDER_REFERENCE"),
 'Adding the Pro poster must not alter the other tier identities')
console.log('Official Pro poster source hash and both public preview surfaces: OK')
