import { NextResponse } from 'next/server'

export const dynamic='force-dynamic'

// Backward-compatible no-op for older installed clients. The upgraded Divine
// Shield preserves sessions; only explicit sign-out or genuine session expiry
// can invalidate an account session.
export async function POST(){
  return NextResponse.json({
    success:true,
    evacuated:false,
    preserved:true,
    reason:'divine_shield_preserves_sessions',
  },{headers:{'Cache-Control':'no-store'}})
}
