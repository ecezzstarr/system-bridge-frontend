import { randomInt } from 'node:crypto'
import { sql } from './db'

export interface IdentityData {
  name: string
  phone: string
  [key: string]: any
}

const FILE_NUMBER_PREFIX = 'WEAVE'
const FILE_NUMBER_MIN = 100_000_000_000
const FILE_NUMBER_MAX_EXCLUSIVE = 1_000_000_000_000
const MAX_GENERATION_ATTEMPTS = 12

// New File Numbers are deliberately unrelated to issuance order.
// Example: WEAVE-583104927361
export function createRandomFileNumberCandidate() {
  const randomNumber = randomInt(FILE_NUMBER_MIN, FILE_NUMBER_MAX_EXCLUSIVE)
  return `${FILE_NUMBER_PREFIX}-${randomNumber}`
}

// Ensure the necessary tables and columns exist
export async function ensureFneTables() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS file_folders (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        file_number VARCHAR(50) NOT NULL UNIQUE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        bridger_id UUID REFERENCES users(id),
        client_id UUID REFERENCES users(id),
        identity_data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        registered_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `

    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS file_number VARCHAR(50) UNIQUE
    `

    await sql`
      CREATE INDEX IF NOT EXISTS idx_file_folders_file_number ON file_folders(file_number)
    `

    return true
  } catch (error) {
    console.error('Failed to ensure FNE tables:', error)
    return false
  }
}

async function fileNumberAlreadyExists(fileNumber: string) {
  const result = await sql`
    SELECT 1
    FROM (
      SELECT file_number FROM file_folders WHERE file_number = ${fileNumber}
      UNION ALL
      SELECT file_number FROM users WHERE file_number = ${fileNumber}
    ) existing
    LIMIT 1
  `
  return result.length > 0
}

function isUniqueViolation(error: any) {
  return error?.code === '23505' ||
    String(error?.message || '').toLowerCase().includes('unique constraint')
}

export async function generateFileNumber(bridgerId: string, identityData: IdentityData) {
  const ready = await ensureFneTables()
  if (!ready) throw new Error('File Number Engine is unavailable')

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const fileNumber = createRandomFileNumberCandidate()

    if (await fileNumberAlreadyExists(fileNumber)) continue

    try {
      const result = await sql`
        INSERT INTO file_folders (file_number, bridger_id, identity_data, status)
        VALUES (${fileNumber}, ${bridgerId}::uuid, ${identityData}, 'pending')
        RETURNING *
      `

      return result[0]
    } catch (error: any) {
      // The UNIQUE constraint is the final protection against a rare race/collision.
      if (isUniqueViolation(error)) continue
      throw error
    }
  }

  throw new Error('Unable to generate a unique random File Number')
}

export async function validateFileNumber(fileNumber: string) {
  await ensureFneTables()

  const result = await sql`
    SELECT * FROM file_folders
    WHERE file_number = ${fileNumber} AND status = 'pending'
    LIMIT 1
  `
  return result[0] || null
}

export async function getFileFolders() {
  await ensureFneTables()

  return await sql`
    SELECT ff.*, u.name as bridger_name, u.email as bridger_email
    FROM file_folders ff
    LEFT JOIN users u ON ff.bridger_id = u.id
    ORDER BY ff.created_at DESC
  `
}
