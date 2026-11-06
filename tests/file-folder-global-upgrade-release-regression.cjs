const assert=require('assert')
const fs=require('fs')
const path=require('path')
const ts=require('typescript')
const vm=require('vm')
const base=path.resolve(__dirname,'..')
const read=p=>fs.readFileSync(path.join(base,p),'utf8')
const pricing=read('lib/file-folder-pricing.ts')
const tierMatch=pricing.match(/export const FILE_FOLDER_TIERS = \[([^\]]+)\] as const/)
assert.ok(tierMatch,'Every File Folder must use a shared tier contract')
assert.deepStrictEqual(tierMatch[1].match(/'[^']+'/g).map(x=>x.slice(1,-1)),['standard','pro','premium','plus'])
assert.ok(pricing.includes("requested === 'plus'")&&pricing.includes('plusFlameCoin: 60000'),
 'Plus is a distinct, explicitly selected tier')
assert.ok(read('app/file-folder/page.tsx').includes('>Plus · Completed systems</span>')&&
 read('app/file-folder/page.tsx').includes('>Pro</span>'),
 'Public File Folder entrance must show all four types')
assert.ok(read('app/api/bridge/file-folder/purchase/route.ts').includes("getFileFolderTier(amountFlameCoin, requestedTier)"),
 'Every checkout tier must pass the explicit fixed price contract')
const activation=read('lib/pro-file-folder-activation.ts')
const gate=read('components/system-switch/client-file-folder-gate.tsx')
const entry=read('app/api/client/file-folder-entry/route.ts')
const switchApi=read('app/api/client/system-switch/route.ts')
const worldApi=read('app/api/client/file-folder-world/route.ts')
const reminder=read('components/client/pro-folder-upgrade-reminder.tsx')
const management=read('app/api/admin/pro-activations/route.ts')
assert.ok(activation.includes("PRO_ACTIVATION_FEE_USDT = 680")&&
 read('lib/client-file-folder.ts').includes('WEAVE-2026-0907-0001'),
 'CJ Dorado keeps her original File Number and the one-time 680 USDT fee')
assert.ok(management.includes("action==='prepare'")&&management.includes("action==='confirm_signature'")&&
 management.includes("action==='approve_payment'")&&management.includes('FOR UPDATE'),
 'Pro administration separates preparation, signed agreement, manual blockchain verification and release')
assert.ok(management.includes('signed_agreement_verified_at')&&management.includes('business_plan_submitted_at')&&
 management.includes('independentlyVerified')&&management.includes('verifiedAmountUSDT')&&
 management.includes('verifiedTxHash'),
 'Forensics may not invent a signature, business plan or verified USDT payment')
assert.ok(management.includes("WHERE file_number=")&&management.includes('folder.client_id'),
 'Pro offer cannot take over another Clients File Folder')
assert.ok(gate.includes("stage === 'construction'")&&gate.includes('680 USDT')&&
 reminder.includes('680 USDT'),
 'Client sees an accurate one-time fee and pre-entry activation reminder')
assert.ok(entry.includes("proGate.status!=='active'")&&
 switchApi.includes("proGate.status!=='active'")&&
 worldApi.includes("activation.status!=='active'"),
 'All private Pro world endpoints block unpaid activation without blocking ordinary login')
assert.ok(activation.includes('signed_agreement_verified_at')&&
 activation.includes('business_plan_submitted_at')&&
 activation.includes("status='pending_forensics'"),
 'Agreement and business plan are required before manually reviewed payment')
const releases=read('lib/file-folder-world-release.ts')
const globalApi=read('app/api/admin/file-folder-world-releases/route.ts')
const globalPage=read('app/(app)/admin/file-folder-world-releases/page.tsx')
assert.ok(releases.includes('pg_advisory_xact_lock')&&
 releases.includes('expectedCurrentVersion')&&
 releases.includes("state='archived'")&&releases.includes('draftRollbackFileFolderWorldRelease'),
 'Publishing and rollback require atomic versioning, no blind overwrite')
assert.ok(globalApi.includes('getAuthUser')&&globalApi.includes("role==='admin'")&&
 globalPage.includes('Publish to all File Folders'),
 'A protected separate engine must control global File Folder updates')
assert.ok(switchApi.includes('getPublishedFileFolderRelease')&&
 read('app/client/system-switch/page.tsx').includes('data-global-file-folder-release'),
 'All signed-in Client worlds should read the same published release')
const src=ts.transpileModule(
 (pricing.match(/export function fileFolderTierLabel\([\s\S]+?\n\}/)||[])[0]||'',
 {compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText
assert.ok(src.includes('Plus'))
console.log('Four File Folder tiers, 680 USDT Pro activation and global Administration release regression passed')
