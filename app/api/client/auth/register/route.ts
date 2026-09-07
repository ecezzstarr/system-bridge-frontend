import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import bcrypt from 'bcryptjs'
import { ensureCjDoradoFolder, ensureClientFileFolderSchema, claimFileFolder } from '@/lib/client-file-folder'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'

const getDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

async function openWorkshop(sql: ReturnType<typeof neon>, clientId: string, fileNumber: string, clientName: string) {
  await ensureClientWorkshopSchema(sql)
  const workshopType = fileNumber === 'WEAVE-2026-0907-0001' ? 'crypto_exchange' : 'formation'
  const title = workshopType === 'crypto_exchange' ? 'CJ Dorado · Crypto Exchange Workshop' : `${clientName} · System Switch Workshop`
  const description = workshopType === 'crypto_exchange'
    ? 'A productive System Switch workshop formed around the Client\'s reviewed interactions concerning funds, vault access, crypto buying and selling, income and system operation.'
    : 'A productive System Switch workshop formed from the Client\'s Interaction in Motion.'
  await sql`
    INSERT INTO client_system_workshops (client_id, file_number, workshop_type, title, description)
    VALUES (${clientId}::uuid, ${fileNumber}, ${workshopType}, ${title}, ${description})
    ON CONFLICT (client_id) DO UPDATE SET
      file_number = EXCLUDED.file_number,
      workshop_type = EXCLUDED.workshop_type,
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      updated_at = NOW()
  `
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, phone, name, business_name, referredBy, file_number } = await request.json()
    if (!email || !password || !name) return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })

    const sql = getDb()
    await ensureClientFileFolderSchema(sql)
    await ensureCjDoradoFolder(sql)
    const normalizedFileNumber = typeof file_number === 'string' ? file_number.trim().toUpperCase() : ''

    if (normalizedFileNumber) {
      const existingByFile = await sql`
        SELECT id, name, email, phone, business_name, assigned_bridger_id
        FROM clients WHERE UPPER(file_number) = ${normalizedFileNumber} LIMIT 1
      `
      if (existingByFile.length > 0) {
        const existing = existingByFile[0]
        if (existing.email && existing.email.toLowerCase() !== email.toLowerCase()) {
          return NextResponse.json({ error: 'The File Number is already attached to another Client email.' }, { status: 409 })
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        const [client] = await sql`
          UPDATE clients SET email=${email}, password_hash=${hashedPassword}, name=${name},
            phone=${phone || existing.phone || ''}, business_name=${business_name || existing.business_name || ''}
          WHERE id=${existing.id}::uuid
          RETURNING id, name, email, phone, business_name, assigned_bridger_id, file_number
        `
        await claimFileFolder(sql, client.id, normalizedFileNumber, client.name)
        await openWorkshop(sql, client.id, normalizedFileNumber, client.name)
        const token = Buffer.from(`${client.id}_${Date.now()}`).toString('base64')
        return NextResponse.json({
          token,
          client: { id: client.id, email: client.email, phone: client.phone, name: client.name, business_name: client.business_name, role: 'client', assigned_bridger_id: client.assigned_bridger_id, file_number: client.file_number },
          file_folder: { file_number: client.file_number, status: 'active', workshop: 'ready' },
        })
      }
    }

    const existing = await sql`SELECT id FROM clients WHERE email=${email}`
    if (existing.length > 0) return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    const hashedPassword = await bcrypt.hash(password, 10)

    let bridgerId = null
    if (referredBy) {
      const bridgers = await sql`
        SELECT id FROM users WHERE id::text LIKE ${referredBy + '%'}
        AND (role='bridger' OR departmental_code='HOPE') LIMIT 1
      `
      if (bridgers.length > 0) bridgerId = bridgers[0].id
    }

    const newClient = await sql`
      INSERT INTO clients (name,email,phone,password_hash,business_name,file_number,assigned_bridger_id,referred_by)
      VALUES (${name},${email},${phone || ''},${hashedPassword},${business_name || ''},${normalizedFileNumber || null},${bridgerId},${bridgerId})
      RETURNING id,name,email,phone,business_name,file_number,assigned_bridger_id
    `
    const client = newClient[0]
    if (normalizedFileNumber) {
      const claimed = await claimFileFolder(sql, client.id, normalizedFileNumber, client.name)
      if (!claimed) {
        await sql`DELETE FROM clients WHERE id=${client.id}::uuid`
        return NextResponse.json({ error: 'File Number could not be claimed. Registration was not completed.' }, { status: 409 })
      }
      await openWorkshop(sql, client.id, normalizedFileNumber, client.name)
    }

    const token = Buffer.from(`${client.id}_${Date.now()}`).toString('base64')
    return NextResponse.json({ token, client: { id:client.id,email:client.email,phone:client.phone,name:client.name,business_name:client.business_name,role:'client',assigned_bridger_id:client.assigned_bridger_id,file_number:client.file_number } })
  } catch (error) {
    console.error('Client register error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Registration failed' }, { status: 500 })
  }
}
