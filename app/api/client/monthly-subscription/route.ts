import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb, ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { ensureEnterpriseDreamSchema } from '@/lib/enterprise-dream'
import { getPool } from '@/lib/db'
import {
  getClientMonthlyStanding,
  ensureClientMonthlySchema,
  subscribeClientMonthly,
  normalizeRegisteredGender,
} from '@/lib/client-monthly-subscription'

async function authorizedClient(request:NextRequest) {
  const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim() || null
  return resolveClientToken(token,getFileFolderDb())
}

export async function GET(request:NextRequest) {
  const clientId=await authorizedClient(request)
  if(!clientId)return NextResponse.json({error:'Client login required'},{status:401})
  try {
    return NextResponse.json({success:true,standing:await getClientMonthlyStanding(clientId)},{headers:{'Cache-Control':'private, no-store'}})
  } catch(e:any) {
    return NextResponse.json({error:e?.message||'Unable to read Client standing'},{status:500})
  }
}

export async function POST(request:NextRequest) {
  const clientId=await authorizedClient(request)
  if(!clientId)return NextResponse.json({error:'Client login required'},{status:401})
  try {
    await ensureClientMonthlySchema()
    const body=await request.json()
    if(body.action==='complete_registration_gender'){
      const gender=normalizeRegisteredGender(body.gender)
      if(!gender)return NextResponse.json({error:'Select Male or Female to complete your registration identity.'},{status:400})
      const row=await getPool().query(`
        UPDATE users SET gender=$2 WHERE id=$1::uuid AND role='client' AND (gender IS NULL OR TRIM(gender)='')
        RETURNING gender
      `,[clientId,gender])
      if(!row.rows.length)return NextResponse.json({error:'Registration gender is already recorded and cannot be replaced here.'},{status:409})
      return NextResponse.json({success:true,standing:await getClientMonthlyStanding(clientId)})
    }
    if(body.action!=='subscribe')return NextResponse.json({error:'Unsupported subscription action'},{status:400})
    await ensureClientFileFolderSchema(getFileFolderDb())
    await ensureEnterpriseDreamSchema(getFileFolderDb())
    const result=await subscribeClientMonthly(clientId)
    if(!result.success) {
      return NextResponse.json({success:false,...result,error:
        result.reason==='insufficient_balance'?'Your Main Client Wallet needs 600 Flame Coin.'
        :result.reason==='gender_missing'?'Complete the missing registration gender before subscribing.'
        :result.reason==='client_inactive'?'This Client account is not active.'
        :result.reason==='file_folder_inactive'?'Activate your owned File Folder before beginning the 600 Flame Coin monthly subscription.'
        :'Monthly subscription could not complete.'},
        {status:result.reason==='insufficient_balance'?409:400})
    }
    return NextResponse.json({...result,standing:await getClientMonthlyStanding(clientId)})
  }catch(e:any){return NextResponse.json({error:e?.message||'Unable to complete Client subscription'},{status:500})}
}
