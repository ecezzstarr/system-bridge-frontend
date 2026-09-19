import { sql } from './db'

export interface IdentityData {
  name: string
  phone: string
  [key: string]: any
}

// Ensure the necessary tables and columns exist
export async function ensureFneTables() {
  try {
    // 1. Create file_folders table
    await sql`
      CREATE TABLE IF NOT EXISTS file_folders (
        id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        file_number VARCHAR(50) NOT NULL UNIQUE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        bridger_id UUID REFERENCES users(id),
        client_id UUID REFERENCES users(id), -- Note: WEAVE clients are stored in users table with role 'client'
        identity_data JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        registered_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `

    // 2. Add file_number to users table if it doesn't exist
    await sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS file_number VARCHAR(50) UNIQUE
    `

    // 3. Create index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_file_folders_file_number ON file_folders(file_number)
    `
    
    return true
  } catch (error) {
    console.error('Failed to ensure FNE tables:', error)
    return false
  }
}

export async function generateFileNumber(bridgerId: string, identityData: IdentityData) {
  await ensureFneTables()

  const now = new Date()
  const year = now.getFullYear() 
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const dateStr = `${month}${day}`
  
  const prefix = `WEAVE-${year}-${dateStr}`
  
  // Find the highest sequence for today
  const latest = await sql`
    SELECT file_number 
    FROM file_folders 
    WHERE file_number LIKE ${prefix + '%'} 
    ORDER BY file_number DESC 
    LIMIT 1
  `
  
  let sequence = 1
  if (latest.length > 0) {
    const lastNum = latest[0].file_number
    const parts = lastNum.split('-')
    const lastSeqStr = parts[parts.length - 1]
    if (lastSeqStr) {
      const parsedSeq = parseInt(lastSeqStr)
      if (!isNaN(parsedSeq)) {
        sequence = parsedSeq + 1
      }
    }
  }
  
  const fileNumber = `${prefix}-${String(sequence).padStart(4, '0')}`
  
  // Insert into file_folders
  const result = await sql`
    INSERT INTO file_folders (file_number, bridger_id, identity_data, status)
    VALUES (${fileNumber}, ${bridgerId}::uuid, ${identityData}, 'pending')
    RETURNING *
  `
  
  return result[0]
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
