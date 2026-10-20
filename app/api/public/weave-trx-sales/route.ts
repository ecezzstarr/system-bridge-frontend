import {NextResponse} from 'next/server'
const retired=()=>NextResponse.json({
  error:'Prospects buy Flame Coin, not TRX. The former TRX-sales endpoint is retired.',
  url:'/system-switch/bridge-radiance/flame-coin'
},{status:410})
export async function GET(){return retired()}
export async function POST(){return retired()}
