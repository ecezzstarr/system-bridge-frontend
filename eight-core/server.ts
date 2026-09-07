#!/usr/bin/env node
/**
 * EIGHT Core - standalone Google Cloud Run service.
 * Mutating operations require EIGHT_INTERNAL_TOKEN.
 * EIGHT is a system participant, not an unrestricted database or filesystem shell.
 */
import express from 'express'
import { neon } from '@neondatabase/serverless'
import { GoogleGenerativeAI } from '@google/generative-ai'

const app = express()
// EIGHT is server-to-server. Do not expose its internal API to arbitrary browsers.
app.use(express.json({ limit: '2mb' }))

const getDb = () => {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL not set')
  return neon(process.env.DATABASE_URL)
}

function requireInternalToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const expected = process.env.EIGHT_INTERNAL_TOKEN
  if (!expected) return res.status(503).json({ success: false, error: 'EIGHT internal authorization is not configured' })
  const supplied = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!supplied || supplied !== expected) return res.status(401).json({ success: false, error: 'Unauthorized' })
  next()
}

const getAI = () => {
  const key = process.env.GOOGLE_AI_KEY || process.env.GEMINI_API_KEY
  return key ? new GoogleGenerativeAI(key) : null
}

const EIGHT_SYSTEM_PROMPT = `You are EIGHT, the system builder AI for Weave/System Switch.
You may reason about the system and return proposed actions, but you must not invent balances, transactions, permissions, or completed work.
Operational actions are limited to approved Weave functions. Do not request arbitrary SQL, filesystem writes, shell commands, deployment commands, or credential access.`

app.get('/health', (_req, res) => res.json({ status: 'online', service: 'eight-core', timestamp: new Date().toISOString() }))

app.post('/chat', requireInternalToken, async (req, res) => {
  try {
    const { messages = [], context } = req.body
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) return res.status(400).json({ success: false, error: 'messages required' })
    const ai = getAI(); if (!ai) return res.status(503).json({ success: false, error: 'AI not configured' })
    const model = ai.getGenerativeModel({ model: process.env.EIGHT_MODEL || 'gemini-1.5-flash' })
    const history = messages.slice(-50, -1).filter((m: any) => m?.content).map((m: any) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: String(m.content).slice(0, 12000) }] }))
    const chat = model.startChat({ history }); const last = messages[messages.length - 1]
    const prompt = `${EIGHT_SYSTEM_PROMPT}\n\nContext: ${JSON.stringify(context || {}).slice(0, 20000)}\n\nUser: ${String(last.content || '').slice(0, 12000)}`
    const result = await chat.sendMessage(prompt)
    return res.json({ success: true, response: result.response.text(), actions: [] })
  } catch (error) { console.error('EIGHT chat error', error instanceof Error ? error.message : 'unknown error'); return res.status(500).json({ success:false,error:'EIGHT chat failed' }) }
})

async function fundWallet(userId:string,amount:number,target:'play_balance'|'balance_trx',sql:any){
  const result=await sql(`UPDATE wallets SET ${target}=${target}+$1,updated_at=NOW() WHERE user_id=$2::uuid RETURNING id,balance_trx,play_balance`,[amount,userId])
  if(!result.length)return null
  await sql`INSERT INTO ledger_entries(id,user_id,entry_type,amount,currency,description,balance_after,created_at) VALUES(gen_random_uuid(),${userId}::uuid,'admin_credit',${amount},'TRX',${'EIGHT funded '+target},${result[0][target]},NOW())`
  return result[0]
}

app.post('/execute', requireInternalToken, async (req, res) => {
  try {
    const { action, payload = {} } = req.body; const sql=getDb()
    switch(action){
      case 'stats':{const [users,wallets,games]=await Promise.all([sql`SELECT COUNT(*) AS count FROM users`,sql`SELECT COALESCE(SUM(balance_trx),0) AS total FROM wallets`,sql`SELECT COUNT(*) AS count FROM casino_games`]);return res.json({success:true,stats:{users:Number(users[0]?.count||0),totalTrx:Number(wallets[0]?.total||0),casinoGames:Number(games[0]?.count||0)}})}
      case 'wallet_summary':{const [summary]=await sql`SELECT COUNT(*) AS total_wallets,COALESCE(SUM(balance_trx),0) AS total_trx,COALESCE(SUM(balance_usdt),0) AS total_usdt,COALESCE(SUM(play_balance),0) AS total_play FROM wallets`;return res.json({success:true,summary})}
      case 'user_list':{const role=payload.role?String(payload.role):null;const users=role?await sql`SELECT u.id,u.email,u.username,u.name,u.role,u.is_active,u.created_at,COALESCE(w.balance_trx,0) AS balance_trx,COALESCE(w.play_balance,0) AS play_balance FROM users u LEFT JOIN wallets w ON w.user_id=u.id WHERE u.role=${role} ORDER BY u.created_at DESC LIMIT 100`:await sql`SELECT u.id,u.email,u.username,u.name,u.role,u.is_active,u.created_at,COALESCE(w.balance_trx,0) AS balance_trx,COALESCE(w.play_balance,0) AS play_balance FROM users u LEFT JOIN wallets w ON w.user_id=u.id ORDER BY u.created_at DESC LIMIT 100`;return res.json({success:true,users})}
      case 'fund_wallet':{const userId=String(payload.userId||'');const amount=Number(payload.amount);if(!/^[0-9a-f-]{36}$/i.test(userId)||!Number.isFinite(amount)||amount<=0||amount>100000000)return res.status(400).json({success:false,error:'Valid userId and positive amount required'});const target=payload.target==='play'?'play_balance':'balance_trx';const wallet=await fundWallet(userId,amount,target,sql);if(!wallet)return res.status(404).json({success:false,error:'Wallet not found'});return res.json({success:true,wallet})}
      default:return res.status(403).json({success:false,error:'Action not permitted'})
    }
  } catch(error){console.error('EIGHT execute error',error instanceof Error?error.message:'unknown error');return res.status(500).json({success:false,error:'EIGHT execution failed'})}
})

app.get('/stats',requireInternalToken,async(_req,res)=>{try{const sql=getDb();const [users,wallets,games]=await Promise.all([sql`SELECT COUNT(*) AS count FROM users`,sql`SELECT COALESCE(SUM(balance_trx),0) AS total FROM wallets`,sql`SELECT COUNT(*) AS count FROM casino_games`]);return res.json({success:true,stats:{totalUsers:Number(users[0]?.count||0),totalTrx:Number(wallets[0]?.total||0),casinoGames:Number(games[0]?.count||0)}})}catch(error){console.error('EIGHT stats error',error instanceof Error?error.message:'unknown error');return res.status(500).json({success:false,error:'Stats failed'})}})

app.get('/users',requireInternalToken,async(req,res)=>{try{const role=typeof req.query.role==='string'&&req.query.role!=='all'?req.query.role:null;const sql=getDb();const users=role?await sql`SELECT u.id,u.email,u.username,u.name,u.role,u.is_active,COALESCE(w.balance_trx,0) AS balance_trx,COALESCE(w.play_balance,0) AS play_balance FROM users u LEFT JOIN wallets w ON u.id=w.user_id WHERE u.role=${role} ORDER BY u.created_at DESC LIMIT 100`:await sql`SELECT u.id,u.email,u.username,u.name,u.role,u.is_active,COALESCE(w.balance_trx,0) AS balance_trx,COALESCE(w.play_balance,0) AS play_balance FROM users u LEFT JOIN wallets w ON u.id=w.user_id ORDER BY u.created_at DESC LIMIT 100`;return res.json({success:true,users})}catch(error){console.error('EIGHT users error',error instanceof Error?error.message:'unknown error');return res.status(500).json({success:false,error:'User query failed'})}})

app.post('/fund',requireInternalToken,async(req,res)=>{try{const userId=String(req.body.userId||'');const amount=Number(req.body.amount);if(!/^[0-9a-f-]{36}$/i.test(userId)||!Number.isFinite(amount)||amount<=0||amount>100000000)return res.status(400).json({success:false,error:'Valid userId and positive amount required'});const target=req.body.target==='play'?'play_balance':'balance_trx';const sql=getDb();const wallet=await fundWallet(userId,amount,target,sql);if(!wallet)return res.status(404).json({success:false,error:'Wallet not found'});return res.json({success:true,wallet})}catch(error){console.error('EIGHT fund error',error instanceof Error?error.message:'unknown error');return res.status(500).json({success:false,error:'Funding failed'})}})

app.get('/schema',requireInternalToken,async(_req,res)=>{try{const sql=getDb();const rows=await sql`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position`;const schema:Record<string,Array<{column:string;type:string}>>={};for(const row of rows){if(!schema[row.table_name])schema[row.table_name]=[];schema[row.table_name].push({column:row.column_name,type:row.data_type})}return res.json({success:true,schema})}catch(error){console.error('EIGHT schema error',error instanceof Error?error.message:'unknown error');return res.status(500).json({success:false,error:'Schema query failed'})}})

const PORT=Number(process.env.PORT||8080)
app.listen(PORT,()=>console.log(`EIGHT Core running on port ${PORT}`))
