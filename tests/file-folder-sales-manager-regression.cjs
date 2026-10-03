const fs=require('node:fs')
const path=require('node:path')
const assert=require('node:assert/strict')

const root=path.resolve(__dirname,'..')
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8')

const roleDistrictSource=read('lib/weave-role-districts.ts')
const fileFolderSalesManagerSource=read('lib/file-folder-sales-manager.ts')
const fileFolderSalesManagerPageSource=read('app/(app)/admin/file-folder-sales-manager/page.tsx')
const fileFolderSalesManagerApiSource=read('app/api/admin/file-folder-sales-manager/route.ts')
const fileFolderSalesManagerCronSource=read('app/api/cron/file-folder-sales-manager/route.ts')
const fileFolderSalesManagerWorkflowSource=read('.github/workflows/weave-file-folder-sales-manager.yml')
const echoSalesManagerSource=read('lib/echo-model.ts')

assert.ok(roleDistrictSource.includes('/admin/file-folder-sales-manager'),'Administration world exposes the Echo and EIGHT File Folder Sales Manager')
assert.ok(fileFolderSalesManagerSource.includes('FILE_FOLDER_WEEKLY_SALES_TARGET_DEFAULT = 1')&&fileFolderSalesManagerSource.includes('runEchoSalesCoordination')&&fileFolderSalesManagerSource.includes('runEightSalesIntelligence'),'Weekly File Folder management combines a real target, Echo execution and EIGHT intelligence')
assert.ok(fileFolderSalesManagerSource.includes("status='confirmed'")&&fileFolderSalesManagerSource.includes("status='approved'")&&fileFolderSalesManagerSource.includes('remainingSales'),'Weekly pace uses confirmed File Folder evidence from both purchase rails')
assert.ok(echoSalesManagerSource.includes('runEchoSalesCoordination')&&echoSalesManagerSource.includes('No deceptive pressure')&&echoSalesManagerSource.includes('false scarcity')&&echoSalesManagerSource.includes('Never claim a sale is guaranteed.'),'Echo sales manager explicitly rejects fabricated scarcity and guaranteed sales behavior')
assert.ok(fileFolderSalesManagerPageSource.includes('Echo · Active Manager')&&fileFolderSalesManagerPageSource.includes('EIGHT · Commercial Intelligence'),'Administration sees execution and intelligence as separate manager responsibilities')
assert.ok(fileFolderSalesManagerApiSource.includes("action === 'complete_action'")&&fileFolderSalesManagerApiSource.includes('weeklyTarget'),'Sales manager API supports action closure and Administration target control')
assert.ok(fileFolderSalesManagerCronSource.includes('.github/workflows/weave-file-folder-sales-manager.yml')&&fileFolderSalesManagerWorkflowSource.includes("cron: '30 7 * * *'"),'File Folder sales manager runs unattended each Nigeria morning')

console.log('File Folder sales manager regression checks passed')
