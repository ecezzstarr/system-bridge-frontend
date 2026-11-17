const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const crypto=require('node:crypto')
const vm=require('node:vm')
const ts=require('typescript')
const root=path.resolve(__dirname,'..')
const read=(file)=>fs.readFileSync(path.join(root,file),'utf8')
const sources=['lib/client-tron-chain-verification.ts','lib/client-trx-deposits.ts',
 'app/api/deposit/tron/route.ts','components/payments/client-tron-funding.tsx',
 'app/api/admin/deposit/tron/verify/route.ts','app/api/admin/client-deposits/route.ts',
 'app/(app)/admin/client-deposits/page.tsx','app/(app)/wallet/deposit-withdraw/page.tsx']
for(const file of sources){
 const syntax=ts.createSourceFile(file,read(file),ts.ScriptTarget.Latest,true,file.endsWith('.tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS)
 assert.equal(syntax.parseDiagnostics.length,0,'TSX parse error '+file)
}
const exported={}
const code=ts.transpileModule(read(sources[0]),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText
vm.runInNewContext(code,{exports:exported,module:{exports:exported},
 require:(name)=>{
   if(name==='node:crypto')return crypto
   if(name==='@/lib/world/constants')return {WORLD_RULES:{COMPANY_TRX_WALLET:'TFT8e4EbMTvfQUGBHSz6LWTi4wokRBBz32'}}
   throw new Error('unexpected import '+name)
 },Buffer,BigInt,AbortSignal,fetch:()=>{throw new Error('No HTTP in unit tests')},console},{filename:'chain-verification'})
const company='TFT8e4EbMTvfQUGBHSz6LWTi4wokRBBz32'
const target='413c20a2715ead63fb091ef199d8810a08d4cbfb39'
assert.equal(exported.tronAddressToHex(company),target)
const hash='f'.repeat(64)
const transfer=(destination=target,amount=15000000)=>({
 txID:hash,ret:[{contractRet:'SUCCESS'}],
 raw_data:{contract:[{type:'TransferContract',
   parameter:{value:{owner_address:'41'+'ab'.repeat(20),to_address:destination,amount}}}]}
})
const good=exported.validateSolidifiedTrxTransfer(transfer(),hash,15,company)
assert.equal(good.receivedTrx,15)
assert.equal(good.destinationHex,target)
assert.equal(good.confirmation,'solidified')
assert.throws(()=>exported.validateSolidifiedTrxTransfer(transfer(),hash,14,company),/differs/)
assert.throws(()=>exported.validateSolidifiedTrxTransfer(transfer('41'+'cd'.repeat(20)),hash,15,company),/not received/)
assert.throws(()=>exported.validateSolidifiedTrxTransfer({...transfer(),txID:'e'.repeat(64)},hash,15,company),/mismatch/)
assert.throws(()=>exported.validateSolidifiedTrxTransfer({...transfer(),ret:[{contractRet:'FAILED'}]},hash,15,company),/not succeeded/)
assert.throws(()=>exported.validateSolidifiedTrxTransfer({
 ...transfer(),raw_data:{contract:[{type:'TriggerSmartContract',parameter:{value:{to_address:target,amount:15000000}}}]}
},hash,15,company),/native TRX/)
assert.throws(()=>exported.tronAddressToHex('T'.repeat(34)),/checksum|payload/)
const deposits=read('lib/client-trx-deposits.ts'),client=read('app/api/deposit/tron/route.ts')
assert.ok(deposits.includes("process.env.CLIENT_TRON_FUNDING_ENABLED==='true'"),'TRX feature disabled by default')
assert.ok(deposits.includes('verifyClientNativeTrxDeposit('),'Credit requires live confirmed chain transfer')
assert.ok(deposits.includes('weave_client_tron_chain_verifications'),'Independent proof persisted')
assert.ok(deposits.includes('pg_advisory_xact_lock'),'Prevent duplicate hash')
assert.ok(deposits.includes("status='pending'"),'Credits pending only')
assert.ok(deposits.includes('UPDATE wallets SET balance_trx=balance_trx+$2'),'Credit only after verification')
assert.ok(client.includes("user.role!=='client'"),'Only Clients may fund TRX')
for(const source of ['bybit','bitget','tron_wallet','other_tron_wallet']){
 assert.ok(deposits.includes("'"+source+"'"),'Missing sender '+source)
}
assert.ok(client.includes('CLIENT_TRON_FUNDING_ENABLED'),'Release flag enforced')
assert.ok(client.includes('confirmSentToCompany'),'User confirmation required')
assert.ok(client.includes('notifyDepositSubmitted'),'Forensics notified of pending evidence')
assert.ok(read('components/payments/client-tron-funding.tsx').includes('data-client-verified-tron-funding'))
assert.ok(read('app/(app)/wallet/deposit-withdraw/page.tsx').includes('<ClientTronFunding'))
assert.ok(read('app/api/admin/deposit/tron/verify/route.ts').includes('decideClientTronDeposit'))
const outgoingRoute=read('app/api/admin/withdrawal/tron-settlement/route.ts')
const adminWithdrawal=read('components/admin/administration-control-terminal.tsx')
assert.ok(read('lib/client-tron-chain-verification.ts').includes('verifyWeaveNativeTrxPayout'))
assert.ok(read('lib/client-tron-chain-verification.ts').includes('proof.sourceHex!==tronAddressToHex(WORLD_RULES.COMPANY_TRX_WALLET)'))
assert.ok(outgoingRoute.includes("u.role='client'"),'Only Client TRON withdrawals')
assert.ok(outgoingRoute.includes("admin.role!=='admin'"),'Only authorized Administrations can settle payouts')
assert.ok(outgoingRoute.includes('verifyWeaveNativeTrxPayout(hash,expected'),'Independent confirmed outgoing proof required')
assert.ok(outgoingRoute.includes("status='completed'"),'Only settled outgoing transfer marked complete')
assert.ok(outgoingRoute.includes('tx_hash char(64) NOT NULL UNIQUE'),'Cannot reuse a paid transaction hash')
assert.ok(outgoingRoute.includes('FOR UPDATE OF w'),'Withdrawal settlement serialized')
assert.ok(adminWithdrawal.includes('data-weave-client-tron-withdrawal-settlement'),'Settlement desk in admin withdrawal operations')
assert.ok(adminWithdrawal.indexOf('data-weave-client-tron-withdrawal-settlement')>adminWithdrawal.indexOf('function WithdrawalApprovalSection'),'Settlement UI in correct admin section')
assert.ok(adminWithdrawal.includes('verify outgoing transfer and mark settled')||
 adminWithdrawal.includes('Verify outgoing transfer and mark settled'),'No payout completed without evidence')
assert.ok(deposits.includes('forensicsAttributionConfirmed!==true'),'No credit without Forensics Client attribution')
assert.ok(deposits.includes('attribution_reference'),'Store the verified ownership attribution record')
assert.ok(read('app/(app)/admin/client-deposits/page.tsx').includes('attributionByDeposit'),'Reviewer must record independent payer evidence')
assert.ok(read('app/api/admin/deposit/tron/verify/route.ts').includes('forensicsAttributionConfirmed'),'No approval bypass through server route')
console.log('PASS: native solidified TRX from Bybit/Bitget/Wallet, proof of Weave receipt and payout, no credit or settlement from hash alone')
