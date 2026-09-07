import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@/lib/pg-neon'
import bcrypt from 'bcryptjs'
import { ensureClientSessionSchema } from '@/lib/client-vault'

const getDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not configured')
  return neon(process.env.DATABASE_URL)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 })

    const sql = getDb()
    const clients = await sql`SELECT id,email,phone,name,business_name,role,assigned_bridger_id,file_number,password_hash FROM clients WHERE LOWER(email) = ${email} LIMIT 1`
    if (!clients.length) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    const client = clients[0]
    if (!await bcrypt.compare(password, client.password_hash || '')) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })

    await ensureClientSessionSchema(sql)
    const token = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
    await sql`INSERT INTO client_sessions (client_id, token, created_at, expires_at) VALUES (${client.id}::uuid, ${token}, NOW(), NOW() + INTERVAL '7 days')`

    return NextResponse.json({
      token,
      client: { id: client.id, email: client.email, phone: client.phone || '', name: client.name, business_name: client.business_name || '', role: client.role || 'client', assigned_bridger_id: client.assigned_bridger_id, file_number: client.file_number || null },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Client login error:', error instanceof Error ? error.message : 'unknown error')
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
