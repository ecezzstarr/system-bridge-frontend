import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password, phone, name, business_name, referredBy, bridgeCode, bridgeSessionId } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Check if client already exists
    const existing = await sql`SELECT id FROM clients WHERE email = ${email}`
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Find bridger if referred. bridgeCode (from a Bridge AI link/QR/widget) is
    // authoritative and cryptographically unguessable — trust it over the
    // legacy 8-char-prefix referredBy guess when both are present.
    let bridgerId = null
    let sourceBridgeId: string | null = null
    if (bridgeCode) {
      const bridges = await sql`
        SELECT id, bridger_id FROM bridge_ais WHERE bridge_code = ${bridgeCode} AND status = 'active'
      `
      if (bridges.length > 0) {
        bridgerId = bridges[0].bridger_id
        sourceBridgeId = bridges[0].id
      }
    }
    if (!bridgerId && referredBy) {
      // referredBy is the first 8 chars of a bridger's user ID
      const bridgers = await sql`
        SELECT id FROM users 
        WHERE id::text LIKE ${referredBy + '%'} 
        AND (role = 'bridger' OR departmental_code = 'HOPE')
        LIMIT 1
      `
      if (bridgers.length > 0) {
        bridgerId = bridgers[0].id
      }
    }

    // Create client
    const newClient = await sql`
      INSERT INTO clients (name, email, phone, password_hash, business_name, assigned_bridger_id, referred_by)
      VALUES (${name}, ${email}, ${phone || ''}, ${hashedPassword}, ${business_name || ''}, ${bridgerId}, ${bridgerId})
      RETURNING id, name, email, phone, business_name, assigned_bridger_id
    `

    if (newClient.length === 0) {
      throw new Error('Failed to create client record')
    }

    const client = newClient[0]
    const token = Buffer.from(`${client.id}_${Date.now()}`).toString('base64')

    if (sourceBridgeId) {
      // Match on the actual session id passed through from the chat page —
      // the old visitor_fingerprint guess couldn't work since phone/email
      // aren't known until this registration step, after the fingerprint
      // was already generated.
      if (bridgeSessionId) {
        await sql`
          UPDATE bridge_sessions
          SET status = 'converted', converted_client_id = ${client.id}::uuid
          WHERE id = ${bridgeSessionId}::uuid AND bridge_id = ${sourceBridgeId}::uuid
        `.catch(() => {})
      }
      await sql`
        INSERT INTO bridge_events (bridge_id, event_type)
        VALUES (${sourceBridgeId}::uuid, 'registration')
      `.catch(() => {})
    }

    return NextResponse.json({
      token,
      client: {
        id: client.id,
        email: client.email,
        phone: client.phone,
        name: client.name,
        business_name: client.business_name,
        assigned_bridger_id: client.assigned_bridger_id,
      },
    })
  } catch (error: any) {
    console.error('Client register error:', error)
    return NextResponse.json(
      { error: 'Registration failed', details: error.message },
      { status: 500 }
    )
  }
}
