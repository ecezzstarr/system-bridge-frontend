import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb, ensureClientFileFolderSchema, ensureCjDoradoFolder, claimFileFolder } from '@/lib/client-file-folder'
import { resolveClientToken, ensureClientVaultSchema } from '@/lib/client-vault'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'
import { ensureClientBusinessStore } from '@/lib/client-business-store'
import { ensureClientVaultLedgerSchema } from '@/lib/client-vault-ledger'
import { ensureClientInternationalPaymentProfile } from '@/lib/client-international-payments'
import { ensureEnterpriseDreamSchema, getEnterpriseDream } from '@/lib/enterprise-dream'

export async function GET(request: NextRequest) {
  try {
    const sql = getFileFolderDb()
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
    const clientId = await resolveClientToken(token, sql)
    if (!clientId) return NextResponse.json({ error:'Client login required' },{status:401})
    await ensureClientFileFolderSchema(sql); await ensureClientVaultSchema(sql); await ensureClientWorkshopSchema(sql); await ensureClientVaultLedgerSchema(sql); await ensureEnterpriseDreamSchema(sql); await ensureCjDoradoFolder(sql)
    const [client] = await sql`SELECT id,name,email,whatsapp_number AS phone,business_name,file_number,referred_by_bridger_id AS assigned_bridger_id FROM users WHERE id=${clientId}::uuid LIMIT 1`
    if(!client)return NextResponse.json({error:'Client record not found'},{status:404})
    if(client.file_number) await sql`INSERT INTO client_file_folders(client_id,file_number,client_name,status) VALUES(${client.id}::uuid,${client.file_number},${client.name},'active') ON CONFLICT(file_number) DO NOTHING`
    const folder=client.file_number?await claimFileFolder(sql,client.id,client.file_number,client.name):null
    if(!folder)return NextResponse.json({error:'Your File Folder is not available for this account. Contact your assigned support team.'},{status:409})
    const [vault]=await sql`SELECT balance,currency FROM client_vaults WHERE client_id=${client.id}::uuid`
    await sql`INSERT INTO client_system_workshops(client_id,file_number,workshop_type,title) VALUES(${client.id}::uuid,${client.file_number},${folder.workshop_type || 'formation'},'System Formation Workshop') ON CONFLICT(client_id) DO NOTHING`
    const [workshop]=await sql`SELECT id,workshop_type,title,description FROM client_system_workshops WHERE client_id=${client.id}::uuid LIMIT 1`
    const [bridge]=await sql`SELECT u.id,u.name,u.username FROM users u WHERE u.id=${client.assigned_bridger_id || '00000000-0000-0000-0000-000000000000'}::uuid AND u.role='bridger' AND u.is_active=true LIMIT 1`
    const agents=workshop?await sql`SELECT u.id,u.name,u.username,u.departmental_code FROM client_workshop_agents a JOIN users u ON u.id=a.agent_id WHERE a.workshop_id=${workshop.id}::uuid AND a.active=true AND u.role='agent' AND u.is_active=true ORDER BY u.name`:[]
    const [report]=await sql`SELECT id,summary,insights,recommended_actions,source_message_count,created_at FROM bridge_ai_reports WHERE client_id=${client.id}::uuid ORDER BY created_at DESC LIMIT 1`
    const store=client.file_number?await ensureClientBusinessStore(sql,client.id,client.file_number,client.business_name||client.name):null
    const items=store?await sql`SELECT id,name,description,price,currency,enabled FROM client_store_items WHERE store_id=${store.id}::uuid ORDER BY created_at DESC`:[]
    const orders=store?await sql`SELECT id,item_id,customer_name,customer_contact,customer_wallet,payment_reference,amount,currency,status,payment_status,created_at FROM client_store_orders WHERE store_id=${store.id}::uuid ORDER BY created_at DESC LIMIT 20`:[]
    const internationalPayments=await ensureClientInternationalPaymentProfile(sql,client.id)
    const withdrawals=await sql`SELECT id,amount,currency,destination,status,created_at FROM client_vault_withdrawals WHERE client_id=${client.id}::uuid ORDER BY created_at DESC LIMIT 20`
    const enterpriseState=await getEnterpriseDream(sql,client.id)
    const workshopType=workshop?.workshop_type||folder.workshop_type||'formation'
    const isCrypto=workshopType==='crypto_exchange'
    const isEnterprise=workshopType==='enterprise_dream'
    const modules=isCrypto
      ? ['Market','Buy','Sell','Holdings','Orders','Activity','Business Store','International Payments','Business Formation','Technology']
      : isEnterprise
        ? ['Enterprise Dream','Legions','Profit & Livelihood','Sector Movement','Business Store','International Payments','Business','Technology']
        : ['Interaction','Formation','Business Store','International Payments','Business','Technology','Productivity']
    const enterprise={
      position:folder.weave_position||'client',
      enterprise_status:folder.enterprise_status||enterpriseState.application?.status||'none',
      workshop_type:workshopType,
      enterprise_name:folder.enterprise_name||enterpriseState.application?.enterprise_name||null,
      sector:folder.enterprise_sector||enterpriseState.application?.sector||null,
      application:enterpriseState.application,
      legions:enterpriseState.legions,
    }
    return NextResponse.json({
      success:true,
      verified:true,
      client:{id:client.id,name:client.name,email:client.email,business_name:client.business_name,file_number:client.file_number},
      file_folder:folder,
      vault:{balance:Number(vault?.balance||0),currency:vault?.currency||'Flame Coin',withdrawals},
      workshop:{
        type:workshopType,
        title:workshop?.title||(isCrypto?'Crypto Exchange Workshop':isEnterprise?'Enterprise Dream Workshop':'System Formation Workshop'),
        status:folder.status,
        purpose:workshop?.description||(isEnterprise
          ? 'Carry the approved enterprise as a living File Folder: organize profit, participants, Legions, sector movement, systems and sustainable livelihood.'
          : 'Build and form the productive systems and businesses recognized through the Client’s Interaction in Motion.'),
        modules
      },
      enterprise,
      business_store:store?{...store,items,orders,public_url:`/store/${store.public_slug}`} : null,
      international_payments:internationalPayments,
      bridge:bridge||null,
      approved_agents:agents,
      bridge_ai:{available:true,name:'Bridge AI',purpose:'The AI participant inside the File Folder and System Switch.',last_report:report||null}
    }, {headers:{'Cache-Control':'private, no-store'}})
  } catch(error){ console.error('[client/system-switch] error:',error instanceof Error?error.message:'unknown error'); return NextResponse.json({error:'Unable to open System Switch'},{status:500}) }
}
