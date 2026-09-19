import { NextRequest, NextResponse } from 'next/server'
import { getSessionByToken } from '@/lib/db'
import { 
  issueDepartmentalCode, 
  listDepartmentalCodes, 
  revokeDepartmentalCode,
  Department
} from '@/lib/departmental-codes'

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || 
                request.cookies.get('ssb_auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await getSessionByToken(token)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const codes = await listDepartmentalCodes()
    return NextResponse.json({ codes })
  } catch (error) {
    console.error('List codes error:', error)
    return NextResponse.json({ error: 'Failed to list codes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || 
                request.cookies.get('ssb_auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await getSessionByToken(token)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { department, expiresInDays } = await request.json()

    if (!department || !['AGENT', 'BRIDGER'].includes(department)) {
      return NextResponse.json({ error: 'Invalid department' }, { status: 400 })
    }

    const code = await issueDepartmentalCode(department as Department, session.user_id, expiresInDays)
    return NextResponse.json({ code })
  } catch (error) {
    console.error('Issue code error:', error)
    return NextResponse.json({ error: 'Failed to issue code' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const token = request.headers.get('Authorization')?.replace('Bearer ', '') || 
                request.cookies.get('ssb_auth_token')?.value

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const session = await getSessionByToken(token)
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing code ID' }, { status: 400 })
    }

    await revokeDepartmentalCode(id, session.user_id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Revoke code error:', error)
    return NextResponse.json({ error: 'Failed to revoke code' }, { status: 500 })
  }
}
