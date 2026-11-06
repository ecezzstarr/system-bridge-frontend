const assert = require('node:assert/strict')
const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript')
const { Pool } = require('pg')
const uri = process.env.WEAVE_SYSTEM_SWITCH_TEST_DATABASE_URL
if (!uri || new URL(uri).pathname !== '/weave_switch_test') throw Error('Use disposable weave_switch_test connection only')
const schema = 'weave_push_qa_' + Date.now()
const root = new Pool({ connectionString: uri })
const pool = new Pool({ connectionString: uri, options: '-c search_path=' + schema })
const sent = []
let failure
function loadPush() {
  const exports = {}
  const push = { ...require('web-push'), sendNotification: async (...args) => { sent.push(args); if (failure) throw failure } }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/web-push.ts', 'utf8'), {
    compilerOptions: { module: 1, target: 9, esModuleInterop: true },
  }).outputText, { exports, URL, console, setInterval,
    require: name => name === '@/lib/db' ? { getPool: () => pool } : name === 'web-push' ? push : require(name) })
  return exports
}
async function run() {
  await root.query('CREATE SCHEMA ' + schema)
  await pool.query(`CREATE TABLE users(id uuid PRIMARY KEY);
    CREATE TABLE notifications(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id),
      title text, content text, is_read boolean DEFAULT false)`)
  const push = loadPush()
  const keys = await push.ensurePush()
  const otherProcess = loadPush()
  assert.equal((await otherProcess.ensurePush()).publicKey, keys.publicKey, 'VAPID key survives process restarts')
  const user = '70000000-0000-4000-8000-000000000011'
  await pool.query('INSERT INTO users VALUES($1)', [user])
  const endpoint = 'https://fcm.googleapis.com/fcm/send/qa-only'
  await pool.query('INSERT INTO weave_push_subscriptions(endpoint,user_id,p256dh,auth) VALUES($1,$2,$3,$4)', [endpoint,user,'qa','qa'])
  const notification = (await pool.query("INSERT INTO notifications(user_id,title,content) VALUES($1,'Payment','Confirmed') RETURNING id",[user])).rows[0].id
  assert.equal((await pool.query('SELECT * FROM weave_push_queue')).rowCount, 1)
  const transaction = await pool.connect()
  await transaction.query('BEGIN')
  await transaction.query("INSERT INTO notifications(user_id,title) VALUES($1,'Rolled back')",[user])
  await transaction.query('ROLLBACK')
  transaction.release()
  assert.equal((await pool.query('SELECT * FROM weave_push_queue')).rowCount, 1, 'Rolled-back payments cannot notify')
  await Promise.all([push.deliverPushBatch(), otherProcess.deliverPushBatch()])
  assert.equal(sent.length, 1, 'Multiple processes do not send the same queue row')
  assert.equal(JSON.parse(sent[0][1]).id, notification)
  assert.equal((await pool.query('SELECT * FROM weave_push_queue')).rowCount, 0)
  await pool.query("INSERT INTO notifications(user_id,title) VALUES($1,'Retry')",[user])
  failure = { statusCode: 503 }
  await push.deliverPushBatch()
  assert.equal((await pool.query('SELECT attempts FROM weave_push_queue')).rows[0].attempts, 1)
  await pool.query('UPDATE weave_push_queue SET available_at=now()')
  failure = { statusCode: 410 }
  await push.deliverPushBatch()
  assert.equal((await pool.query('SELECT * FROM weave_push_subscriptions')).rowCount, 0)
  assert.equal((await pool.query('SELECT * FROM weave_push_queue')).rowCount, 0)
  console.log('Real PostgreSQL push trigger, transactional queue, concurrent delivery, retry and expiry passed')
}
run().catch(error => { console.error(error); process.exitCode=1 }).finally(async () => {
  await pool.end()
  await root.query('DROP SCHEMA IF EXISTS ' + schema + ' CASCADE')
  await root.end()
})
