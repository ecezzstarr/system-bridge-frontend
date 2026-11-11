import { getPool } from '@/lib/db'

export interface AdminDirectoryOptions {
  filter:'all'|'unassigned'
  search:string
  offset:number
  limit:number
}

/** Users are the source of truth for identity, not an inner join to finance. */
export async function getAdminUserDirectory(options:AdminDirectoryOptions) {
  const pool=getPool()
  const search=options.search.trim().slice(0,120)
  const where=[
    "WHERE ($1::text='all' OR (u.role <> 'admin' AND",
    "(u.departmental_code IS NULL OR",
    "(u.role='bridger' AND u.assigned_agent_id IS NULL))))",
    "AND ($2::text='' OR",
    "u.name ILIKE '%' || $2::text || '%' OR",
    "u.email ILIKE '%' || $2::text || '%' OR",
    "u.username ILIKE '%' || $2::text || '%' OR",
    "u.role ILIKE '%' || $2::text || '%')",
  ].join(' ')

  // Missing escrow/wallet tables must never hide registered people.
  // The mandatory users query is independently checked.
  const count=await pool.query('SELECT COUNT(*)::int AS total FROM users u '+where,
    [options.filter,search])
  const rows=await pool.query(
    'SELECT u.id,u.email,u.username,u.name,u.role,u.departmental_code,'+
    'u.assigned_agent_id,u.created_at,u.is_active FROM users u '+where+
    ' ORDER BY u.created_at DESC NULLS LAST,u.id DESC LIMIT $3::int OFFSET $4::int',
    [options.filter,search,options.limit,options.offset])
  const users=rows.rows.map(row=>({
    ...row,platform_wallet_balance:null as number|null,
    escrow_balance:null as number|null,wallet_status:'unavailable',
  }))
  const ids=users.map(u=>String(u.id))
  const warnings:string[]=[]
  if (ids.length) {
    try {
      const wallets=await pool.query(
        'SELECT user_id,id,balance_trx,is_primary FROM wallets '+
        'WHERE user_id=ANY($1::uuid[]) ORDER BY created_at ASC NULLS LAST,id ASC',
        [ids])
      const byUser=new Map<string,any[]>()
      for (const row of wallets.rows) {
        const id=String(row.user_id)
        byUser.set(id,[...(byUser.get(id)||[]),row])
      }
      for (const user of users) {
        const matches=byUser.get(String(user.id))||[]
        const primary=matches.filter(row=>row.is_primary===true)
        const wallet=primary.length===1?primary[0]:
          primary.length===0&&matches.length===1?matches[0]:null
        if (!wallet) user.wallet_status=matches.length===0?'missing':'ambiguous'
        else {
          const amount=Number(wallet.balance_trx)
          if(Number.isFinite(amount)){
            user.platform_wallet_balance=amount
            user.wallet_status=primary.length===1?'primary':'legacy'
          }
        }
      }
    } catch(error) {
      console.error('[Admin users] Wallet lookup failed but users remain visible:',error)
      warnings.push('Wallet amounts are temporarily unavailable. Registered users remain visible.')
    }

    try {
      const escrow=await pool.query(
        "SELECT user_id,COALESCE(SUM(amount),0) AS total FROM escrow "+
        "WHERE user_id=ANY($1::uuid[]) AND status='locked' "+
        "AND currency IN ('Flame Coin','System Switch','TRX') GROUP BY user_id",
        [ids])
      const byUser=new Map(escrow.rows.map(row=>[String(row.user_id),Number(row.total)]))
      for(const user of users) {
        const amount=byUser.get(String(user.id))??0
        user.escrow_balance=Number.isFinite(amount)?amount:null
      }
    } catch(error) {
      console.error('[Admin users] Escrow lookup failed but users remain visible:',error)
      warnings.push('Escrow amounts are temporarily unavailable. Registered users remain visible.')
    }
  }
  const total=Number(count.rows[0]?.total??0)
  return {users,total,hasMore:options.offset+users.length<total,warnings}
}
