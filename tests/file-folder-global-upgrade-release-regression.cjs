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
assert.ok(read('app/file-folder/page.tsx').includes('>Plus</span>')&&
 read('app/file-folder/page.tsx').includes('>Pro</span>'),
 'Public File Folder entrance must show all four types')
assert.ok(read('app/api/bridge/file-folder/purchase/route.ts').includes("requestedTier==='plus'"),
 'Unquoted Plus cannot silently enter TRX checkout')
const upgrade=read('lib/client-folder-upgrade.ts')
const gate=read('components/system-switch/client-file-folder-gate.tsx')
const entry=read('app/api/client/file-folder-entry/route.ts')
const switchApi=read('app/api/client/system-switch/route.ts')
const worldApi=read('app/api/client/file-folder-world/route.ts')
const reminder=read('components/client/pro-folder-upgrade-reminder.tsx')
const management=read('app/api/admin/client-folder-upgrades/route.ts')
const migration=read('migrations/20261023_file_folder_four_tiers_global_releases_cj_pro.sql')
assert.ok(upgrade.includes('CJ_DORADO_FILE_NUMBER')&&
 read('lib/client-file-folder.ts').includes('WEAVE-2026-0907-0001'),
 'CJ Dorado keeps the existing File Number')
assert.ok(management.includes("prepare_cj_pro")&&management.includes("confirm_loan")&&
 management.includes("verify_repayment")&&management.includes("finish_construction"),
 'Administrative flow must distinguish construction, loan funding, repayment and release')
assert.ok(management.includes('loanAccepted')&&management.includes('loanFundingChecked')&&
 management.includes('agreementReference')&&management.includes('fundingReference'),
 'Loan cannot be invented from a chat or an unverified reference')
assert.ok(management.includes('WHERE file_number=')&&management.includes('folder.client_id'),
 'Pro offer cannot take over a different Client File Folder')
assert.ok(gate.includes("stage === 'construction'")&&gate.includes('loan.remaining')&&reminder.includes('upgrade.loan.remaining'),
 'Client should receive an accurate pre-entry loan reminder and construction message')
assert.ok(entry.includes("upgrade.status!=='ready'")&&
 switchApi.includes("upgrade.status!=='ready'")&&worldApi.includes("upgrade.status!=='ready'"),
 'Pro construction must block entry and direct private world API access')
assert.ok(upgrade.includes('loan_funded_at')&&upgrade.includes('loan_agreed_at')&&
 upgrade.includes('remaining:funded?'),
 'Remaining loan must never be shown as an actual obligation before verification')
assert.ok(migration.includes('client_folder_loan_repayments')&&migration.includes('reference varchar(255) NOT NULL UNIQUE'),
 'Personal-loan payments need distinct, idempotent, verifiable records')
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
console.log('Four File Folder tiers, CJ Pro construction/repayment and global Administration release regression passed')
