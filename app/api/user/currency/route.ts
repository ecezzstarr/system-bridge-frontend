import { NextRequest,NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'
import {
  DEFAULT_USER_DISPLAY_CURRENCY,isUserDisplayCurrency,
} from '@/lib/user-display-currency'

const headers={'Cache-Control':'private, no-store'}
async function ensurePreferenceTable(){
  await sql`
    CREATE TABLE IF NOT EXISTS weave_user_currency_preferences (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      display_currency varchar(3) NOT NULL DEFAULT 'USD',
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
}
export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Not authenticated'},{status:401,headers})
  try{
    await ensurePreferenceTable()
    const rows=await sql`
      SELECT display_currency FROM weave_user_currency_preferences
      WHERE user_id=${user.id}::uuid LIMIT 1
    `
    const stored=rows[0]?.display_currency
    const currency=isUserDisplayCurrency(stored)?stored:DEFAULT_USER_DISPLAY_CURRENCY
    return NextResponse.json({currency,baseCurrency:'USD'},{headers})
  }catch(error){
    console.error('[user currency] read failed',error)
    return NextResponse.json({error:'Unable to read currency preference'},{status:503,headers})
  }
}
export async function PUT(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Not authenticated'},{status:401,headers})
  const input=await request.json().catch(()=>null)
  if(!isUserDisplayCurrency(input?.currency)){
    return NextResponse.json({error:'Unsupported currency selection'},{status:400,headers})
  }
  try{
    await ensurePreferenceTable()
    const rows=await sql`
      INSERT INTO weave_user_currency_preferences(user_id,display_currency)
      VALUES (${user.id}::uuid,${input.currency})
      ON CONFLICT(user_id) DO UPDATE SET
        display_currency=EXCLUDED.display_currency,updated_at=NOW()
      RETURNING display_currency
    `
    return NextResponse.json({currency:rows[0].display_currency,baseCurrency:'USD'},{headers})
  }catch(error){
    console.error('[user currency] update failed',error)
    return NextResponse.json({error:'Could not save currency preference'},{status:503,headers})
  }
}
