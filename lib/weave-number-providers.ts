export type NumberLease = {
  provider: string
  providerNumberId: string
  phoneNumber: string
  countryCode: string
  status: 'provisioning' | 'active' | 'leased' | 'released'
  whatsappStatus: 'pending' | 'active' | 'suspended' | 'disconnected'
  smsStatus: 'pending' | 'active' | 'suspended' | 'disconnected'
  costUsd: number
  leaseMinutes?: number
  metadata?: Record<string, unknown>
}

export interface WeaveNumberProvider {
  name: string
  acquire(countryCode: string): Promise<NumberLease>
  getSms(providerNumberId: string): Promise<Array<{ text: string; code?: string }>>
  release(providerNumberId: string): Promise<void>
}

function required(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

/**
 * 5SIM adapter.
 * Important: 5SIM's normal WhatsApp product is an activation/verification
 * product, not a guaranteed long-term telecom lease. We therefore mark the
 * resulting lease as temporary and never represent it as permanent ownership.
 */
export class FiveSimProvider implements WeaveNumberProvider {
  name = '5sim'
  private base = (process.env.FIVESIM_BASE_URL || 'https://5sim.net/v1').replace(/\/$/, '')

  async acquire(countryCode: string): Promise<NumberLease> {
    const token = required('FIVESIM_API_KEY')
    const country = countryCode.toLowerCase()
    const operator = process.env.FIVESIM_OPERATOR || 'any'
    const product = 'whatsapp'
    const response = await fetch(`${this.base}/user/buy/activation/${encodeURIComponent(country)}/${encodeURIComponent(operator)}/${product}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.message || `5SIM returned ${response.status}`)
    if (!data?.phone || !data?.id) throw new Error('5SIM did not return a usable activation')
    return {
      provider: this.name,
      providerNumberId: String(data.id),
      phoneNumber: String(data.phone),
      countryCode: countryCode.toUpperCase(),
      status: 'leased',
      whatsappStatus: 'pending',
      smsStatus: 'active',
      costUsd: Number(data.price || 0),
      leaseMinutes: 20,
      metadata: { product, operator: data.operator, rawStatus: data.status },
    }
  }

  async getSms(providerNumberId: string) {
    const token = required('FIVESIM_API_KEY')
    const response = await fetch(`${this.base}/user/check/${encodeURIComponent(providerNumberId)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.message || `5SIM returned ${response.status}`)
    return Array.isArray(data?.sms)
      ? data.sms.map((item: any) => ({ text: String(item.text || ''), code: item.code ? String(item.code) : undefined }))
      : []
  }

  async release(providerNumberId: string) {
    const token = required('FIVESIM_API_KEY')
    await fetch(`${this.base}/user/cancel/${encodeURIComponent(providerNumberId)}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
  }
}

/**
 * SMSPool adapter. Supports both temporary activation and long-term rentals
 * on the provider side; the exact pool/service is configurable so Weave does
 * not hard-code one country's inventory or pricing.
 */
export class SmsPoolProvider implements WeaveNumberProvider {
  name = 'smspool'
  private base = (process.env.SMSPOOL_BASE_URL || 'https://api.smspool.net').replace(/\/$/, '')

  async acquire(countryCode: string): Promise<NumberLease> {
    const key = required('SMSPOOL_API_KEY')
    const service = process.env.SMSPOOL_SERVICE || 'WhatsApp'
    const form = new URLSearchParams({ key, country: countryCode, service })
    const response = await fetch(`${this.base}/purchase/sms`, { method: 'POST', body: form })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data?.number) throw new Error(data?.message || `SMSPool returned ${response.status}`)
    return {
      provider: this.name,
      providerNumberId: String(data.orderid || data.order_id || data.id),
      phoneNumber: String(data.number),
      countryCode: countryCode.toUpperCase(),
      status: 'leased',
      whatsappStatus: 'pending',
      smsStatus: 'active',
      costUsd: Number(data.cost || data.price || 0),
      metadata: { service, pool: data.pool, raw: data },
    }
  }

  async getSms(providerNumberId: string) {
    const key = required('SMSPOOL_API_KEY')
    const form = new URLSearchParams({ key, orderid: providerNumberId })
    const response = await fetch(`${this.base}/sms/`, { method: 'POST', body: form })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data?.message || `SMSPool returned ${response.status}`)
    const messages = Array.isArray(data?.sms) ? data.sms : []
    return messages.map((item: any) => ({ text: String(item.sms || item.text || ''), code: item.code ? String(item.code) : undefined }))
  }

  async release(providerNumberId: string) {
    const key = required('SMSPOOL_API_KEY')
    const form = new URLSearchParams({ key, orderid: providerNumberId })
    await fetch(`${this.base}/request/cancel`, { method: 'POST', body: form })
  }
}

export function getWeaveNumberProvider(): WeaveNumberProvider {
  const provider = (process.env.WEAVE_NUMBER_PROVIDER || '5sim').toLowerCase()
  if (provider === '5sim') return new FiveSimProvider()
  if (provider === 'smspool') return new SmsPoolProvider()
  throw new Error(`Unsupported Weave number provider: ${provider}`)
}
