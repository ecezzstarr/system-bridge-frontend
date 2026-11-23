/** Currency codes allowed on WEAVE user financial cards (ISO 4217). */
export const USER_DISPLAY_CURRENCIES = [
  { code:'USD', label:'USD · US Dollar' },
  { code:'NGN', label:'NGN · Nigerian Naira' },
  { code:'EUR', label:'EUR · Euro' },
  { code:'GBP', label:'GBP · British Pound' },
  { code:'GHS', label:'GHS · Ghanaian Cedi' },
  { code:'KES', label:'KES · Kenyan Shilling' },
  { code:'ZAR', label:'ZAR · South African Rand' },
  { code:'UGX', label:'UGX · Ugandan Shilling' },
  { code:'CAD', label:'CAD · Canadian Dollar' },
  { code:'AUD', label:'AUD · Australian Dollar' },
  { code:'AED', label:'AED · UAE Dirham' },
  { code:'INR', label:'INR · Indian Rupee' },
  { code:'JPY', label:'JPY · Japanese Yen' },
  { code:'CHF', label:'CHF · Swiss Franc' },
  { code:'CNY', label:'CNY · Chinese Yuan' },
  { code:'BRL', label:'BRL · Brazilian Real' },
] as const

export type UserDisplayCurrency = typeof USER_DISPLAY_CURRENCIES[number]['code']
export const DEFAULT_USER_DISPLAY_CURRENCY: UserDisplayCurrency = 'USD'

export function isUserDisplayCurrency(value: unknown): value is UserDisplayCurrency {
  return typeof value === 'string' &&
    USER_DISPLAY_CURRENCIES.some(option => option.code === value)
}

/** Dollar-base conversions are presentation-only, never settlement quotes. */
export function usdToDisplayCurrency(amountUsd: number, rate: number): number | null {
  if (!Number.isFinite(amountUsd) || !Number.isFinite(rate) ||
    rate <= 0 || Math.abs(amountUsd) > 1_000_000_000_000) return null
  const output = amountUsd * rate
  return Number.isFinite(output) && Math.abs(output) < Number.MAX_SAFE_INTEGER ? output : null
}

export function formatUserDisplayCurrency(value:number, currency:UserDisplayCurrency):string {
  if (!Number.isFinite(value)) return 'Unavailable'
  return new Intl.NumberFormat('en',{
    style:'currency', currency, currencyDisplay:'symbol',
    maximumFractionDigits:currency==='JPY'?0:2,
  }).format(value)
}
