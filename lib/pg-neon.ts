import { Pool } from "pg"

export interface SqlQueryFn {
  (strings: TemplateStringsArray, ...values: any[]): Promise<any[]>
}

const pools = new Map<string, Pool>()

function getConnectionString(connectionString?: string) {
  const resolved = connectionString || process.env.DATABASE_URL
  if (!resolved) {
    throw new Error("DATABASE_URL not configured")
  }
  return resolved
}

function getPool(connectionString?: string) {
  const resolved = getConnectionString(connectionString)

  if (!pools.has(resolved)) {
    pools.set(
      resolved,
      new Pool({
        connectionString: resolved,
        ssl:
          process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : false,
      })
    )
  }

  return pools.get(resolved)!
}

async function executeQuery(
  connectionString: string | undefined,
  strings: TemplateStringsArray,
  values: any[]
) {
  const pool = getPool(connectionString)
  let text = ""

  strings.forEach((str, index) => {
    text += str
    if (index < values.length) {
      text += `$${index + 1}`
    }
  })

  const result = await pool.query(text, values)
  return result.rows
}

async function executeRawQuery(
  connectionString: string | undefined,
  queryText: string,
  values: any[] = []
) {
  const pool = getPool(connectionString)
  const result = await pool.query(queryText, values)
  return result.rows
}

export function createSql(connectionString?: string): SqlQueryFn {
  return (strings: TemplateStringsArray, ...tagValues: any[]) =>
    executeQuery(connectionString, strings, tagValues)
}

export async function runSqlQuery(
  queryText: string,
  values: any[] = [],
  connectionString?: string
) {
  return executeRawQuery(connectionString, queryText, values)
}

export function neon(connectionString?: string): SqlQueryFn
export function neon(strings: TemplateStringsArray, ...values: any[]): Promise<any[]>
export function neon(
  connectionOrStrings?: string | TemplateStringsArray,
  ...values: any[]
): SqlQueryFn | Promise<any[]> {
  if (typeof connectionOrStrings === "string" || connectionOrStrings === undefined) {
    return createSql(connectionOrStrings)
  }

  return executeQuery(undefined, connectionOrStrings, values)
}

export default getPool
