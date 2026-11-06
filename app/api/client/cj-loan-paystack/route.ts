import {NextResponse} from 'next/server'
// Retired: 680 USDT is the one-time Pro File Folder activation fee,
// not a CJ personal loan. Paystack must never collect it here.
const retired=()=>NextResponse.json({error:'This Paystack loan checkout has been retired. Pro activation uses verified USDT TRC-20 receipts.'},
 {status:410,headers:{'Cache-Control':'no-store'}})
export const GET=retired
export const POST=retired
