import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import { ensureClientVaultSchema, resolveClientToken } from '@/lib/client-vault'

async function getClientId(request: NextRequest, sql: ReturnType<typeof neon>) {
  const token = request.cookies.get('client_token')?.value || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
  return resolveClientToken(token, sql)
}

export async function GET(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL || '')
    const clientId = await getClientId(request, sql)
    if (!clientId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await ensureClientVaultSchema(sql)
    const [vault] = await sql`SELECT client_id,balance,currency,updated_at FROM client_vaults WHERE client_id=${clientId}::uuid`
    const ledger = await sql`SELECT id,entry_type,amount,currency,balance_after,source,reference,reason,created_at FROM client_vault_ledger WHERE client_id=${clientId}::uuid ORDER BY created_at DESC LIMIT 50`
    const withdrawals = await sql`SELECT id,amount,currency,destination,status,requested_at,reviewed_at,processed_at,note FROM client_vault_withdrawals WHERE client_id=${clientId}::uuid ORDER BY requested_at DESC LIMIT 20`
    return NextResponse.json({ success:true, vault:vault || {client_id:clientId,balance:0,currency:'TRX'}, ledger, withdrawals }, {headers:{'Cache-Control':'private, no-store'}})
  } catch (error) { return NextResponse.json({success:false,error:'Failed to load Client Vault'},{status:500}) }
}

export async function POST(request: NextRequest) {
  try {
    const sql = neon(process.env.DATABASE_URL || '')
    const clientId = await getClientId(request, sql)
    if (!clientId) return NextResponse.json({ error:'Unauthorized' },{status:401})
    const body = await request.json(); const value=Number(body.amount); const destination=typeof body.destination==='string'?body.destination.trim():''
    if(!Number.isFinite(value)||value<=0||value>100000000) return NextResponse.json({error:'Invalid TRX withdrawal amount'},{status:400})
    if(!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(destination)) return NextResponse.json({error:'Invalid TRON withdrawal destination'},{status:400})
    await ensureClientVaultSchema(sql)
    const [vault]=await sql`SELECT balance,currency FROM client_vaults WHERE client_id=${clientId}::uuid`
    const balance=Number(vault?.balance||0); if(value>balance)return NextResponse.json({error:'Insufficient Client Vault TRX balance'},{status:400})
    if(vault?.currency&&vault.currency!=='TRX')return NextResponse.json({error:'Client Vault is not configured for TRX settlement'},{status:409})
    const [pending]=await sql`SELECT id FROM client_vault_withdrawals WHERE client_id=${clientId}::uuid AND status='pending' LIMIT 1`
    if(pending)return NextResponse.json({error:'A withdrawal is already pending Admin review'},{status:409})
    const [row]=await sql`INSERT INTO client_vault_withdrawals(client_id,amount,currency,destination,status) VALUES(${clientId}::uuid,${value},'TRX',${destination},'pending') RETURNING id,amount,currency,destination,status,requested_at`
    return NextResponse.json({success:true,withdrawal:row,message:'TRX withdrawal submitted for Admin review'},{headers:{'Cache-Control':'no-store'}})
  } catch (error) { return NextResponse.json({success:false,error:'Failed to request TRX withdrawal'},{status:500}) }
}
