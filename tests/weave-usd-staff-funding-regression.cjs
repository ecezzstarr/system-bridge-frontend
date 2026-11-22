const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8')
const currency=read('lib/user-display-currency.ts')
const finance=read('lib/weave-usd-finance.ts')
const paystack=read('app/api/deposit/paystack/route.ts')
const settle=read('lib/paystack-deposits.ts')
const manual=read('lib/manual-paystack-recovery.ts')
const card=read('components/currency/user-currency-card.tsx')
const record=read('app/(app)/ledger/page.tsx')
const wallet=read('app/(app)/wallet/deposit-withdraw/page.tsx')
const preference=read('app/api/user/currency/route.ts')
const migration=read('migrations/20261122_weave_usd_staff_accounts.sql')

function compiled(src,name,stub){
  const result=ts.transpileModule(src,{fileName:name,
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
    reportDiagnostics:true})
  assert.equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0)
  const mod={exports:{}}
  new Function('require','module','exports',result.outputText)(
    name=>stub?.[name]||require(name),mod,mod.exports)
  return mod.exports
}
const currencyFns=compiled(currency,'lib/user-display-currency.ts')
const opts=currencyFns.USER_DISPLAY_CURRENCIES
for(const code of ['USD','NGN','EUR','GBP','GHS','KES','ZAR','CAD','AED']){
  assert(opts.some(x=>x.code===code),'Missing '+code)
  assert(currencyFns.isUserDisplayCurrency(code))
}
assert.equal(currencyFns.isUserDisplayCurrency('FAKE'),false)
assert.equal(currencyFns.usdToDisplayCurrency(1,1500),1500)
assert.equal(currencyFns.usdToDisplayCurrency(1,0),null)
assert(currencyFns.formatUserDisplayCurrency(100,'NGN').includes('100'))

const financeFunctions=compiled(finance,'lib/weave-usd-finance.ts',{
  '@/lib/db':{getPool:()=>{throw Error('Test must not access database')}},
  '@/lib/weave-receipts':{ensureWeaveReceiptSchema:async()=>{}},
  '@/lib/paystack':{},
  '@/lib/deposit-notifications':{},
})
assert.equal(financeFunctions.quoteNgnToUsd(1500,1500),1)
assert.equal(financeFunctions.quoteNgnToUsd(2250,1500),1.5)
assert.equal(financeFunctions.quoteNgnToUsd(1,1500),null)
assert.equal(financeFunctions.quoteNgnToUsd(0,1500),null)
assert.equal(financeFunctions.quoteNgnToUsd(1500,0),null)

assert(finance.includes("cache:'no-store'")&&finance.includes('time_last_update_unix'))
assert(finance.includes('age>36*3600_000'), 'Stale FX rates rejected')
assert(finance.includes('FOR UPDATE OF d'), 'Settlement serializes Paystack duplicates')
assert(finance.includes('weave_usd_wallets SET balance_usd=balance_usd+'), 'USD wallet actually credited')
assert(finance.includes('INSERT INTO weave_usd_ledger'), 'USD ledger entry persisted')
assert(finance.includes("currency,status,description,metadata)"),'Receipt has recorded currency')
assert(!finance.includes('UPDATE wallets SET balance_trx'), 'USD deposit must not credit legacy TRX wallet')
assert(paystack.includes("WEAVE_USD_DEPOSIT_ENABLED==='true'"),'USD funding enabled only after cutover')
assert(paystack.includes('getUsdNgnDepositQuote()')&&paystack.includes('quoteNgnToUsd(amountNgn'),
  'Naira converts to USD at fetched rate')
assert(paystack.includes('weave_usd_deposit_quotes'),'Locked USD quote must be recorded')
assert(settle.includes('settleUsdPaystackDeposit(reference,signedEvent)'),'USD Paystack callbacks must dispatch separately')
assert(manual.includes('usdQuote.rowCount'),'Emergency manual TRX credit cannot touch USD deposits')
assert(migration.includes('UNIQUE REFERENCES deposits(id)'),'Unique settled USD deposit identity')
assert(card.includes('data-currency-picker')&&card.includes("kind==='usd-wallet'"),'User card supports chosen currency')
assert(preference.includes('ON CONFLICT(user_id) DO UPDATE'),'Currency selection is per account')
assert(wallet.includes('<UserCurrencyCard amountUsd={usdBalance}'),'Wallet uses USD-first card')
assert(record.includes('kind="usd-wallet"'),'Record uses USD-first card')
assert(read('app/api/rate/usd-ngn/route.ts').includes('getUsdNgnDepositQuote'))
assert(read('lib/client-trx-deposits.ts').includes('trxPaymentToFlameCoin'),'TRX external deposit path preserved')

const oldFetch=global.fetch
;(async()=>{
  try {
    global.fetch=async()=>({ok:true,json:async()=>({
      result:'success',base_code:'USD',rates:{NGN:1500},
      time_last_update_unix:Math.floor(Date.now()/1000),
    })})
    const quote=await financeFunctions.getUsdNgnDepositQuote()
    assert.equal(quote.ngnPerUsd,1500)
    global.fetch=async()=>({ok:true,json:async()=>({
      result:'success',base_code:'USD',rates:{NGN:1500},
      time_last_update_unix:Math.floor(Date.now()/1000)-4*86400,
    })})
    await assert.rejects(financeFunctions.getUsdNgnDepositQuote(),/rate unavailable/i)
    console.log('WEAVE USD/NGN staff funding, user card currency selection and legacy TRX isolation: passed')
  }finally{global.fetch=oldFetch}
})().catch(error=>{global.fetch=oldFetch;console.error(error);process.exitCode=1})
