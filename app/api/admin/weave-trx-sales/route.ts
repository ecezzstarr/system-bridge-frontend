import {NextResponse} from 'next/server'
const retired=()=>NextResponse.json({
  error:'TRX sales retired. Forensics now manages Flame Coin purchases and wallet credits.',
  adminPath:'/admin/weave-flame-coin-sales'
},{status:410})
export async function GET(){return retired()}
export async function POST(){return retired()}
