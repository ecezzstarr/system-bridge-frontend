import { normalizeClientGender, type ClientGender } from './client-title'
let schemaReady: Promise<void> | null = null
async function ensureGenderSchema(sql: any) {
  if (!schemaReady) schemaReady = (async () => {
    await sql`CREATE TABLE IF NOT EXISTS user_identity_preferences (
      user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      gender varchar(16) CHECK (gender IN ('female','male')),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )`
  })().catch(error => { schemaReady = null; throw error })
  await schemaReady
}
export async function getClientGender(sql: any, userId: string): Promise<ClientGender | null> {
  await ensureGenderSchema(sql)
  const [identity] = await sql`SELECT gender FROM user_identity_preferences WHERE user_id=${userId}::uuid`
  return normalizeClientGender(identity?.gender)
}
export async function saveClientGender(sql: any, userId: string, gender: ClientGender | null) {
  await ensureGenderSchema(sql)
  await sql`INSERT INTO user_identity_preferences(user_id,gender) VALUES (${userId}::uuid,${gender})
    ON CONFLICT(user_id) DO UPDATE SET gender=EXCLUDED.gender,updated_at=NOW()`
}
