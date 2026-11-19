import { NextRequest, NextResponse } from 'next/server'
import { trustedMutationOrigin } from '@/lib/request-origin'
import { readEntryLoanSupport, requestEntryLoanSupport } from '@/lib/department-entry-loan-support'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store' }
const reply = (data: object, status = 200) => NextResponse.json(data, { status, headers })
const tokenOf = (request: NextRequest) => request.headers.get('x-entry-ticket-token')?.trim() || ''

export async function GET(request: NextRequest) {
  const token = tokenOf(request)
  if (!/^[a-f0-9]{64}$/i.test(token)) return reply({ error: 'Ticket access required' }, 401)
  try {
    const result = await readEntryLoanSupport(token)
    if (!result) return reply({ error: 'Ticket not found' }, 404)
    return reply({ success: true, request: result.request })
  } catch (error) {
    console.error('[entry-loan-support] GET failed:', error)
    return reply({ error: 'Support status temporarily unavailable' }, 503)
  }
}

export async function POST(request: NextRequest) {
  if (!trustedMutationOrigin(request)) return reply({ error: 'Forbidden origin' }, 403)
  const token = tokenOf(request)
  if (!/^[a-f0-9]{64}$/i.test(token)) return reply({ error: 'Ticket access required' }, 401)
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') return reply({ error: 'Invalid support request' }, 400)
  const name = String(body.name || '').trim()
  const email = String(body.email || '').trim().toLowerCase()
  const phone = String(body.phone || '').trim()
  const statement = String(body.statement || '').trim()
  if (name.length < 2 || name.length > 120 ||
      email.length > 254 || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email) ||
      phone.length > 80 || statement.length > 600) {
    return reply({ error: 'Provide your name and valid email. Phone and message are optional.' }, 400)
  }
  try {
    const result = await requestEntryLoanSupport(token, { name, email, phone, statement })
    if ('error' in result) return reply({ error: result.error }, result.statusCode)
    return reply({
      success: true, status: result.request.status,
      message: 'Request recorded for Administrations review. This is not loan approval or a paid entry ticket.',
    }, result.created ? 201 : 200)
  } catch (error) {
    console.error('[entry-loan-support] POST failed:', error)
    return reply({ error: 'Could not record your support request. Try again.' }, 503)
  }
}
