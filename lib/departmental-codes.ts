import { sql } from './db'
import crypto from 'crypto'

export type Department = 'AGENT' | 'BRIDGER'
export type CodeStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'REVOKED'

export interface DepartmentalCode {
  id: string
  code: string
  department: Department
  status: CodeStatus
  issued_by?: string
  issued_at: Date
  expires_at?: Date
  used_by?: string
  used_at?: Date
  registration_request_id?: string
}

/**
 * Generates a unique departmental code: DEPT-XXXX-XXXX-XXXX
 */
export function generateCode(department: Department): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segment = () => {
    let s = ''
    for (let i = 0; i < 4; i++) {
      s += chars.charAt(crypto.randomInt(0, chars.length))
    }
    return s
  }
  return `${department}-${segment()}-${segment()}-${segment()}`
}

/**
 * Issues a new departmental code
 */
export async function issueDepartmentalCode(
  department: Department,
  adminId: string,
  expiresInDays?: number,
  registrationRequestId?: string
): Promise<string> {
  const code = generateCode(department)
  const expiresAt = expiresInDays 
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null

  await sql`
    INSERT INTO departmental_codes (
      code, department, issued_by, expires_at, status, registration_request_id
    )
    VALUES (
      ${code},
      ${department},
      ${adminId}::uuid,
      ${expiresAt ? expiresAt.toISOString() : null},
      'ACTIVE',
      ${registrationRequestId || null}::uuid
    )
  `

  // Log the issuance
  await sql`
    INSERT INTO departmental_audit_log (event, department, administration_actor, result, metadata)
    VALUES ('ISSUE_CODE', ${department}, ${adminId}::uuid, 'SUCCESS', ${JSON.stringify({ code })})
  `

  return code
}

/**
 * Validates a departmental code
 */
export async function validateDepartmentalCode(
  code: string,
  department: Department
): Promise<{ valid: boolean; error?: string; codeId?: string }> {
  const rows = await sql`
    SELECT * FROM departmental_codes 
    WHERE code = ${code}
  `

  if (rows.length === 0) {
    return { valid: false, error: 'Code does not exist.' }
  }

  const data = rows[0] as DepartmentalCode

  if (data.department !== department) {
    return { valid: false, error: 'Code belongs to a different department.' }
  }

  if (data.status === 'USED') {
    return { valid: false, error: 'Code has already been used.' }
  }

  if (data.status === 'EXPIRED' || (data.expires_at && new Date(data.expires_at) < new Date())) {
    return { valid: false, error: 'Code has expired.' }
  }

  if (data.status === 'REVOKED') {
    return { valid: false, error: 'Code has been revoked by Administration.' }
  }

  if (data.status !== 'ACTIVE') {
    return { valid: false, error: 'Code is not active.' }
  }

  return { valid: true, codeId: data.id }
}

/**
 * Marks a departmental code as used
 */
export async function useDepartmentalCode(
  code: string,
  userId: string
): Promise<boolean> {
  const result = await sql`
    UPDATE departmental_codes
    SET status = 'USED', used_by = ${userId}::uuid, used_at = NOW(), updated_at = NOW()
    WHERE code = ${code} AND status = 'ACTIVE'
    RETURNING id, department
  `

  if (result.length > 0) {
    // Log the use
    await sql`
      INSERT INTO departmental_audit_log (event, department, target_user, code_id, result)
      VALUES ('USE_CODE', ${result[0].department}, ${userId}::uuid, ${result[0].id}::uuid, 'SUCCESS')
    `
    return true
  }

  return false
}

/**
 * Revokes a departmental code
 */
export async function revokeDepartmentalCode(
  codeId: string,
  adminId: string
): Promise<boolean> {
  const result = await sql`
    UPDATE departmental_codes
    SET status = 'REVOKED', updated_at = NOW()
    WHERE id = ${codeId}::uuid
    RETURNING department
  `

  if (result.length > 0) {
    // Log the revocation
    await sql`
      INSERT INTO departmental_audit_log (event, department, administration_actor, code_id, result)
      VALUES ('REVOKE_CODE', ${result[0].department}, ${adminId}::uuid, ${codeId}::uuid, 'SUCCESS')
    `
    return true
  }

  return false
}

/**
 * Lists all departmental codes (Admin only)
 */
export async function listDepartmentalCodes() {
  return await sql`
    SELECT dc.*, u.name as issued_by_name, uu.name as used_by_name
    FROM departmental_codes dc
    LEFT JOIN users u ON dc.issued_by = u.id
    LEFT JOIN users uu ON dc.used_by = uu.id
    ORDER BY dc.created_at DESC
  `
}
