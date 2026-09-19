const { Pool } = require('pg')

const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
if (!databaseUrl) {
  console.error('NO DATABASE_URL FOUND IN ENV')
  process.exit(1)
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false
})

async function main() {
  const tables = ['withdrawal_requests', 'agent_profiles', 'bridger_profiles', 'users']
  for (const t of tables) {
    console.log('=== ' + t + ' ===')
    const res = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
      [t]
    )
    res.rows.forEach(r => console.log(r.column_name + ' | ' + r.data_type))
    console.log('')
  }
  await pool.end()
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1) })
