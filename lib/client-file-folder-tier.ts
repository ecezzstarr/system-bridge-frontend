import {FILE_FOLDER_PRICING,FILE_FOLDER_TIERS,getFileFolderTier,type FileFolderTier} from '@/lib/file-folder-pricing'
import {getClientFolderUpgrade} from '@/lib/client-folder-upgrade'
import {getProActivationState} from '@/lib/pro-file-folder-activation'

/**
 * The private File Folder, public kingdom theme and any later Client employee
 * theme must resolve the SAME verified tier. Never use a caller-supplied tier.
 * A later lower-priced sale, a Pro activation, or a pending upgrade cannot
 * downgrade a previously verified Premium/Plus owner.
 */
const TIER_ORDER=FILE_FOLDER_TIERS
export function higherVerifiedFileFolderTier(current:FileFolderTier|null,next:FileFolderTier|null){
  if(!next)return current
  return !current||TIER_ORDER.indexOf(next)>TIER_ORDER.indexOf(current)?next:current
}
export function validFileFolderTier(value:unknown):value is FileFolderTier{
  return typeof value==='string'&&FILE_FOLDER_TIERS.includes(value as FileFolderTier)
}
export type VerifiedFileFolderPurchase={
  status?:string|null;file_folder_tier?:string|null;amount_trx?:number|string|null;
  amount_usdt?:number|string|null;payment_method?:string|null
}
const VERIFIED_PURCHASE_STATES=['confirmed','approved','folder_issued','paid_pending_folder'] as const

export function verifiedFileFolderPurchaseTier(purchase:VerifiedFileFolderPurchase):FileFolderTier|null{
  const status=String(purchase.status||'')
  if(!VERIFIED_PURCHASE_STATES.includes(status as typeof VERIFIED_PURCHASE_STATES[number]))return null
  const selected=validFileFolderTier(purchase.file_folder_tier)?purchase.file_folder_tier:null
  if(selected==='plus'){
    // High-value Plus entitlements must have the exact independently confirmed
    // network payment, not an incomplete request or a generic folder-issued flag.
    if(!['confirmed','approved'].includes(status))return null
    return (purchase.payment_method==='trx'&&Number(purchase.amount_trx)===FILE_FOLDER_PRICING.plusTrx)||
      (purchase.payment_method==='usdt'&&Number(purchase.amount_usdt)===FILE_FOLDER_PRICING.plusUsdt)
      ?'plus':null
  }
  return getFileFolderTier(Number(purchase.amount_trx),selected)
}

export type ClientTierOptions={
  clientId:string;fileNumber:string;fallbackFlameCoin?:number|null;
  proActivation?:{status:string}|null
}

export async function resolveVerifiedClientFileFolderTier(sql:any,options:ClientTierOptions):Promise<FileFolderTier>{
  const {clientId,fileNumber}=options
  if(!clientId||!fileNumber)throw new Error('Verified Client ownership is required to resolve a File Folder tier')
  const [tables]=await sql`
    SELECT to_regclass('public.file_folder_purchases')::text AS purchases,
      to_regclass('public.weave_open_world_domains')::text AS domains,
      to_regclass('public.bridge_deposits')::text AS deposits,
      to_regclass('public.company_client_staff_offers')::text AS staff_offers
  `
  let tier:FileFolderTier|null=null
  if(tables?.purchases){
    // Older approved purchases may lack tier/USDT fields. Use a compatible
    // additive schema update rather than dropping the client's prior history.
    await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS file_folder_tier varchar(20)`
    await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS amount_usdt numeric(30,8)`
    const purchases=await sql`
      SELECT status,file_folder_tier,amount_trx,amount_usdt,payment_method
      FROM file_folder_purchases
      WHERE file_number=${fileNumber}
        AND (client_id=${clientId}::uuid OR client_id IS NULL)
        AND status IN ('confirmed','approved','folder_issued','paid_pending_folder')
      ORDER BY COALESCE(confirmed_at,created_at) DESC
      LIMIT 50
    `
    for(const purchase of purchases){
      tier=higherVerifiedFileFolderTier(tier,verifiedFileFolderPurchaseTier(purchase))
    }
  }

  if(tables?.deposits){
    const deposits=await sql`
      SELECT tier_trx FROM bridge_deposits
      WHERE file_number=${fileNumber} AND status='approved'
      ORDER BY COALESCE(verified_at,created_at) DESC LIMIT 30
    `
    for(const deposit of deposits){
      const amount=Number(deposit.tier_trx)
      const verified=amount===FILE_FOLDER_PRICING.premiumFlameCoin
        ?getFileFolderTier(amount,'premium'):getFileFolderTier(amount,'pro')
      tier=higherVerifiedFileFolderTier(tier,verified)
    }
  }

  if(tables?.staff_offers){
    const grants=await sql`
      SELECT folder_tier FROM company_client_staff_offers
      WHERE client_id=${clientId}::uuid AND file_number=${fileNumber} AND status='approved'
    `
    for(const grant of grants){
      tier=higherVerifiedFileFolderTier(tier,validFileFolderTier(grant.folder_tier)?grant.folder_tier:null)
    }
  }

  // World-domain tiers are persisted only after an active Client Folder is
  // provisioned; they preserve older verified entitlements after upgrades.
  if(tables?.domains){
    const [domain]=await sql`
      SELECT tier FROM weave_open_world_domains
      WHERE client_id=${clientId}::uuid AND file_number=${fileNumber} LIMIT 1
    `
    tier=higherVerifiedFileFolderTier(tier,validFileFolderTier(domain?.tier)?domain.tier:null)
  }

  const upgrade=await getClientFolderUpgrade(sql,clientId,fileNumber)
  if(upgrade?.status==='ready'&&validFileFolderTier(upgrade.tier)){
    tier=higherVerifiedFileFolderTier(tier,upgrade.tier)
  }
  const activation=options.proActivation===undefined
    ?await getProActivationState(clientId,fileNumber):options.proActivation
  if(activation?.status==='active')tier=higherVerifiedFileFolderTier(tier,'pro')

  if(tier)return tier
  const fallback=Number(options.fallbackFlameCoin)
  return getFileFolderTier(fallback)||'standard'
}
