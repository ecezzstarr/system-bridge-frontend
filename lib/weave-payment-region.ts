/**
 * Country-sensitive presentation for payment *routing*. This is not a currency
 * conversion market, bank integration, or identity verification service.
 * A stored user choice is the only authoritative checkout preference; browser
 * locale may suggest a country but never establishes residence.
 */
export const WEAVE_PAYMENT_COUNTRIES = [
 {code:'NG',label:'Nigeria',currency:'NGN',symbol:'₦'},
 {code:'GH',label:'Ghana',currency:'GHS',symbol:'GH₵'},
 {code:'KE',label:'Kenya',currency:'KES',symbol:'KSh'},
 {code:'ZA',label:'South Africa',currency:'ZAR',symbol:'R'},
 {code:'GB',label:'United Kingdom',currency:'GBP',symbol:'£'},
 {code:'US',label:'United States',currency:'USD',symbol:'$'},
 {code:'ES',label:'Spain',currency:'EUR',symbol:'€'},
 {code:'FR',label:'France',currency:'EUR',symbol:'€'},
 {code:'DE',label:'Germany',currency:'EUR',symbol:'€'},
 {code:'OTHER',label:'Other country / region',currency:null,symbol:''},
] as const

export type WeaveCountryCode=typeof WEAVE_PAYMENT_COUNTRIES[number]['code']
export type WeavePaymentRail='paystack_ngn'|'tron_trx'
export type WeaveCheckoutPurpose='wallet_deposit'|'file_folder'
export function validWeaveCountry(value:unknown):WeaveCountryCode|null{
 const code=String(value||'').trim().toUpperCase()
 return WEAVE_PAYMENT_COUNTRIES.find(x=>x.code===code)?.code||null
}
export function suggestCountryFromLocale(value:string|null|undefined):WeaveCountryCode|null{
 const tag=String(value||'').replaceAll('_','-').trim()
 const segments=tag.split('-').filter(Boolean)
 // Language-only en is not location; prefer a real language-region tag like en-NG.
 const region=segments.slice(1).find(part=>/^[A-Za-z]{2}$/.test(part))?.toUpperCase()
 if(!region)return null
 return validWeaveCountry(region)
}
export function paymentRegion(country:WeaveCountryCode|null,purpose:WeaveCheckoutPurpose){
 const choice=WEAVE_PAYMENT_COUNTRIES.find(x=>x.code===country)||null
 const naira=choice?.code==='NG'
 const defaultRail:WeavePaymentRail=naira?'paystack_ngn':'tron_trx'
 const methods=[
   {id:'paystack_ngn' as const,label:'Nigerian bank / card via Paystack',
     currency:'NGN',available:naira,verification:'Paystack transaction verification'},
   {id:'flutterwave_ngn' as const,label:'Flutterwave · bank, card, OPay',
     currency:'NGN',available:false,verification:'Not connected to a verified Weave merchant settlement workflow'},
   {id:'tron_trx' as const,label:'TRON wallet · TRX',
     currency:'TRX',available:purpose==='file_folder',verification:purpose==='file_folder'?
       'On-chain hash followed by Administrations confirmation':'Wallet TRX deposit endpoint not enabled'},
   {id:'bybit_source' as const,label:'Bybit · send TRX on TRON',
     currency:'TRX',available:false,verification:'Bybit is an optional source wallet, not an integrated Weave gateway'},
 ] as const
 return {
   country:choice?.code||null,
   localCurrency:choice?.currency||null,
   localSymbol:choice?.symbol||null,
   countryConfirmed:Boolean(choice),
   defaultRail:choice?defaultRail:null,
   methods,
   asset:'System Switch',
   peg:{from:'TRX',to:'System Switch',rate:1},
   notice:'The chosen country controls checkout defaults only. Payment confirmation, network fees and bank/provider availability are checked independently.'
 }
}
