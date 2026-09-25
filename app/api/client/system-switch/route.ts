import { NextRequest, NextResponse } from 'next/server'
import { getFileFolderDb, ensureClientFileFolderSchema, ensureCjDoradoFolder } from '@/lib/client-file-folder'
import { resolveClientToken, ensureClientVaultSchema } from '@/lib/client-vault'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'
import { ensureClientBusinessStore } from '@/lib/client-business-store'
import { ensureClientVaultLedgerSchema } from '@/lib/client-vault-ledger'
import { ensureClientInternationalPaymentProfile } from '@/lib/client-international-payments'
import { ensureEnterpriseDreamSchema, getEnterpriseDream } from '@/lib/enterprise-dream'
import { ensureClientMoneyEnvironment } from '@/lib/client-money-environment'
import { getFileFolderWorldSnapshot } from '@/lib/client-file-folder-world'
import { getFileFolderTier } from '@/lib/file-folder-pricing'

export async function GET(request: NextRequest) {
  try {
    const sql = getFileFolderDb()
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || null
    const clientId = await resolveClientToken(token, sql)
    if (!clientId) return NextResponse.json({ error: 'Client login required' }, { status: 401 })

    await ensureClientFileFolderSchema(sql)
    await ensureClientVaultSchema(sql)
    await ensureClientWorkshopSchema(sql)
    await ensureClientVaultLedgerSchema(sql)
    await ensureEnterpriseDreamSchema(sql)
    await ensureCjDoradoFolder(sql)

    const [client] = await sql`
      SELECT
        id,
        name,
        email,
        whatsapp_number AS phone,
        business_name,
        file_number,
        COALESCE(referred_by, referred_by_bridger_id) AS assigned_bridger_id
      FROM users
      WHERE id = ${clientId}::uuid
      LIMIT 1
    `

    if (!client) return NextResponse.json({ error: 'Client record not found' }, { status: 404 })

    const money = await ensureClientMoneyEnvironment(sql, client.id)

    if (!client.file_number) {
      return NextResponse.json(
        { error: 'File Folder movement required', gate: 'bridge_file_folder' },
        { status: 409 }
      )
    }

    const [folder] = await sql`
      SELECT *
      FROM client_file_folders
      WHERE client_id = ${client.id}::uuid
         OR file_number = ${client.file_number}
      ORDER BY CASE WHEN client_id = ${client.id}::uuid THEN 0 ELSE 1 END
      LIMIT 1
    `

    if (!folder) {
      return NextResponse.json(
        {
          error: 'Your Client account exists, but its File Folder has not been established through the required movement.',
          gate: 'bridge_file_folder',
        },
        { status: 409 }
      )
    }

    if (folder.status !== 'active' || !folder.client_id || String(folder.client_id) !== String(client.id)) {
      return NextResponse.json(
        {
          error: 'Your File Folder exists but System Switch has not been opened for this Client.',
          gate: 'administration',
        },
        { status: 409 }
      )
    }

    const [workshop] = await sql`
      SELECT id, workshop_type, title, description
      FROM client_system_workshops
      WHERE client_id = ${client.id}::uuid
      LIMIT 1
    `

    if (!workshop || folder.workshop_type === 'pending_personalization') {
      return NextResponse.json(
        {
          error: 'Your first workshop is still being formed from your own interaction.',
          gate: 'personalization',
        },
        { status: 409 }
      )
    }

    const [bridge] = await sql`
      SELECT u.id,u.name,u.username
      FROM users u
      WHERE u.id=${client.assigned_bridger_id || '00000000-0000-0000-0000-000000000000'}::uuid
        AND u.role='bridger'
        AND u.is_active=true
      LIMIT 1
    `
    const agents = await sql`
      SELECT u.id,u.name,u.username,u.departmental_code
      FROM client_workshop_agents a
      JOIN users u ON u.id=a.agent_id
      WHERE a.workshop_id=${workshop.id}::uuid
        AND a.active=true
        AND u.role='agent'
        AND u.is_active=true
      ORDER BY u.name
    `
    const [report] = await sql`
      SELECT id,summary,insights,recommended_actions,source_message_count,created_at
      FROM bridge_ai_reports
      WHERE client_id=${client.id}::uuid
      ORDER BY created_at DESC
      LIMIT 1
    `
    const store = await ensureClientBusinessStore(sql,client.id,client.file_number,client.business_name||client.name,workshop.workshop_type==='crypto_exchange')
    const items=store?await sql`SELECT id,name,description,price,currency,offer_type,enabled FROM client_store_items WHERE store_id=${store.id}::uuid ORDER BY created_at DESC`:[]
    const orders=store?await sql`SELECT id,item_id,customer_name,customer_contact,customer_wallet,payment_reference,amount,currency,status,payment_status,created_at FROM client_store_orders WHERE store_id=${store.id}::uuid ORDER BY created_at DESC LIMIT 20`:[]
    const internationalPayments=await ensureClientInternationalPaymentProfile(sql,client.id)
    const withdrawals=await sql`SELECT id,amount,currency,destination,status,created_at FROM client_vault_withdrawals WHERE client_id=${client.id}::uuid ORDER BY created_at DESC LIMIT 20`
    const enterpriseState=await getEnterpriseDream(sql,client.id)
    const fileFolderWorld=await getFileFolderWorldSnapshot(sql,client.id,client.file_number)
    const fileFolderTier=getFileFolderTier(Number(fileFolderWorld.buildFunding.initialFileFolderFlameCoin)) || 'legacy'

    const workshopType=workshop.workshop_type
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
      file_folder_world:fileFolderWorld,
      build_funding:fileFolderWorld.buildFunding,
      file_folder_tier:fileFolderTier,
      premium_dj_enabled:fileFolderTier==='premium',
      vault:{
        balance:money.vault.balance,
        currency:money.vault.currency,
        withdrawals,
        siblings_funds:money.siblingsFunds,
        main_wallet:money.mainWallet,
      },
      workshop:{
        type:workshopType,
        title:workshop.title,
        status:folder.status,
        purpose:workshop.description || 'This workshop continues the specific movement recognized from this Client’s own interaction.',
        modules
      },
      enterprise,
      business_store:store?{...store,items,orders,public_url:`/store/${store.public_slug}`} : null,
      international_payments:internationalPayments,
      bridge:bridge||null,
      approved_agents:agents,
      bridge_ai:{available:true,name:'Bridge AI',purpose:'The AI participant inside the File Folder and System Switch.',last_report:report||null}
    }, {headers:{'Cache-Control':'private, no-store'}})
  } catch(error){
    console.error('[client/system-switch] error:',error instanceof Error?error.message:'unknown error')
    return NextResponse.json({error:'Unable to open System Switch'},{status:500})
  }
}
