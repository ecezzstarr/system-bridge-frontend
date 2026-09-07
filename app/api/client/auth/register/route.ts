import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import bcrypt from 'bcryptjs'
import { ensureCjDoradoFolder, ensureClientFileFolderSchema, claimFileFolder } from '@/lib/client-file-folder'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'
import { ensureClientSessionSchema } from '@/lib/client-vault'

const getDb = () => { if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured'); return neon(process.env.DATABASE_URL) }

async function openWorkshop(sql: ReturnType<typeof neon>, clientId: string, fileNumber: string, clientName: string) {
  await ensureClientWorkshopSchema(sql)
  const workshopType = fileNumber === 'WEAVE-2026-0907-0001' ? 'crypto_exchange' : 'formation'
  const title = workshopType === 'crypto_exchange' ? 'CJ Dorado · Crypto Exchange Workshop' : `${clientName} · System Switch Workshop`
  const description = workshopType === 'crypto_exchange' ? 'A productive System Switch workshop formed around the Client\'s reviewed interactions concerning funds, vault access, crypto buying and selling, income and system operation.' : 'A productive System Switch workshop formed from the Client\'s Interaction in Motion.'
  await sql`INSERT INTO client_system_workshops (client_id,file_number,workshop_type,title,description) VALUES (${clientId}::uuid,${fileNumber},${workshopType},${title},${description}) ON CONFLICT(client_id) DO UPDATE SET file_number=EXCLUDED.file_number,workshop_type=EXCLUDED.workshop_type,title=EXCLUDED.title,description=EXCLUDED.description,updated_at=NOW()`
}

async function issueClientLogin(sql: ReturnType<typeof neon>, client: any, fileNumber: string | null = null) {
  if (fileNumber) {
    const claimed = await claimFileFolder(sql, client.id, fileNumber, client.name)
    if (!claimed) return null
    await openWorkshop(sql, client.id, fileNumber, client.name)
  }
  await ensureClientSessionSchema(sql)
  const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
  await sql`INSERT INTO client_sessions (client_id,token,created_at,expires_at) VALUES (${client.id}::uuid,${token},NOW(),NOW()+INTERVAL '7 days')`
  return { token, client: { id:client.id,email:client.email,phone:client.phone,name:client.name,business_name:client.business_name,role:'client',assigned_bridger_id:client.assigned_bridger_id,file_number:fileNumber || client.file_number || null }, file_folder:fileNumber ? {file_number:fileNumber,status:'active',workshop:'ready'} : undefined }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0,80) : ''
    const name = typeof body.name === 'string' ? body.name.trim().slice(0,120) : ''
    const business_name = typeof body.business_name === 'string' ? body.business_name.trim().slice(0,200) : ''
    const referredBy = typeof body.referredBy === 'string' ? body.referredBy.trim() : ''
    const normalizedFileNumber = typeof body.file_number === 'string' ? body.file_number.trim().toUpperCase() : ''
    if (!email || !password || !name) return NextResponse.json({error:'Name, email, and password are required'},{status:400})
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10 || password.length > 200) return NextResponse.json({error:'Invalid registration data'},{status:400})

    const sql=getDb(); await ensureClientFileFolderSchema(sql); await ensureCjDoradoFolder(sql)
    if (normalizedFileNumber) {
      const [folder]=await sql`SELECT file_number,client_id FROM client_file_folders WHERE file_number=${normalizedFileNumber} LIMIT 1`
      if (!folder) return NextResponse.json({error:'File Number not found. Please check the number supplied by Weave.'},{status:404})
      if (folder.client_id) {
        const [existingOwner]=await sql`SELECT id,name,email,phone,business_name,assigned_bridger_id,file_number FROM clients WHERE id=${folder.client_id}::uuid LIMIT 1`
        if (!existingOwner) return NextResponse.json({error:'The File Folder owner record could not be found.'},{status:409})
        if (existingOwner.email && existingOwner.email.toLowerCase()!==email) return NextResponse.json({error:'The File Number is already attached to another Client email.'},{status:409})
        const hashed=await bcrypt.hash(password,12)
        const [client]=await sql`UPDATE clients SET email=${email},password_hash=${hashed},name=${name},phone=${phone || existingOwner.phone || ''},business_name=${business_name || existingOwner.business_name || ''} WHERE id=${existingOwner.id}::uuid RETURNING id,name,email,phone,business_name,assigned_bridger_id,file_number`
        const result=await issueClientLogin(sql,client,normalizedFileNumber); if(!result)return NextResponse.json({error:'File Folder could not be opened.'},{status:409}); return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}})
      }
      const [existingEmail]=await sql`SELECT id,name,email,phone,business_name,assigned_bridger_id,file_number FROM clients WHERE LOWER(email)=LOWER(${email}) LIMIT 1`
      if(existingEmail) {
        if(existingEmail.file_number && existingEmail.file_number!==normalizedFileNumber) return NextResponse.json({error:'This Client already has a different File Number.'},{status:409})
        const hashed=await bcrypt.hash(password,12)
        const [client]=await sql`UPDATE clients SET password_hash=${hashed},name=${name},phone=${phone || existingEmail.phone || ''},business_name=${business_name || existingEmail.business_name || ''},file_number=${normalizedFileNumber} WHERE id=${existingEmail.id}::uuid RETURNING id,name,email,phone,business_name,assigned_bridger_id,file_number`
        const result=await issueClientLogin(sql,client,normalizedFileNumber); if(!result)return NextResponse.json({error:'File Number could not be claimed.'},{status:409}); return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}})
      }
    }

    const existing=await sql`SELECT id FROM clients WHERE LOWER(email)=LOWER(${email}) LIMIT 1`
    if(existing.length>0)return NextResponse.json({error:'Email already registered'},{status:409})
    const hashedPassword=await bcrypt.hash(password,12)
    let bridgerId=null
    if(referredBy){ const bridgers=await sql`SELECT id FROM users WHERE id::text LIKE ${referredBy+'%'} AND (role='bridger' OR departmental_code='HOPE') LIMIT 1`; if(bridgers.length)bridgerId=bridgers[0].id }
    const newClient=await sql`INSERT INTO clients(name,email,phone,password_hash,business_name,file_number,assigned_bridger_id,referred_by) VALUES(${name},${email},${phone},${hashedPassword},${business_name},${normalizedFileNumber || null},${bridgerId},${bridgerId}) RETURNING id,name,email,phone,business_name,file_number,assigned_bridger_id`
    const client=newClient[0]
    if(normalizedFileNumber){ const result=await issueClientLogin(sql,client,normalizedFileNumber); if(!result){await sql`DELETE FROM clients WHERE id=${client.id}::uuid`;return NextResponse.json({error:'File Number could not be claimed. Registration was not completed.'},{status:409})}; return NextResponse.json(result,{headers:{'Cache-Control':'no-store'}}) }
    return NextResponse.json(await issueClientLogin(sql,client),{headers:{'Cache-Control':'no-store'}})
  } catch(error){ console.error('Client register error:',error instanceof Error?error.message:'unknown error'); return NextResponse.json({error:'Registration failed'},{status:500}) }
}
