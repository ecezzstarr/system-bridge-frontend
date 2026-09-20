// Compatibility for recovered features; always use the live database pool.
import { sql, getPool } from './db'
export function neon(url: string | undefined): typeof sql
export function neon(strings: TemplateStringsArray, ...values: any[]): Promise<any[]>
export function neon(input: string | undefined | TemplateStringsArray, ...values: any[]): typeof sql | Promise<any[]> {
  return Array.isArray(input) ? sql(input as unknown as TemplateStringsArray, ...values) : sql
}
export default { query: (text: string, values?: any[]) => getPool().query(text, values) }
