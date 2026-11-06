import 'server-only'
import {getClientFolderUpgrade} from '@/lib/client-folder-upgrade'
import {getProActivationState} from '@/lib/pro-file-folder-activation'
import {FILE_FOLDER_PRICING,getFileFolderTier,type FileFolderTier} from '@/lib/file-folder-pricing'
import {resolveFileFolderAppearance,FILE_FOLDER_PALETTES} from '@/lib/file-folder-world-presets'
import {getPublishedFileFolderRelease} from '@/lib/file-folder-world-release'

const TIERS:readonly FileFolderTier[]=['standard','pro','premium','plus']
const isTier=(value:unknown):value is FileFolderTier=>typeof value==='string'&&TIERS.includes(value as FileFolderTier)
const higher=(a:FileFolderTier,b:FileFolderTier)=>TIERS.indexOf(a)>TIERS.indexOf(b)

/** Resolve a verified Client's purchased world, never a caller-selected theme. */
export async function getClientKingdomIdentity(sql:any,clientId:string){
  const [owner]=await sql`
    SELECT u.id,u.name,u.business_name,u.file_number
    FROM users u
    JOIN client_file_folders f ON f.client_id=u.id AND f.file_number=u.file_number AND f.status='active'
    WHERE u.id=${clientId}::uuid AND u.role='client' AND COALESCE(u.is_active,true)=true
    LIMIT 1
  `
  if(!owner)return null
  const [tables]=await sql`
    SELECT to_regclass('public.weave_open_world_domains')::text AS domains,
      to_regclass('public.file_folder_purchases')::text AS purchases,
      to_regclass('public.company_client_staff_offers')::text AS staff_offers,
      to_regclass('public.bridge_deposits')::text AS deposits
  `
  let tier:FileFolderTier|null=null
  if(tables?.domains){
    const [domain]=await sql`
      SELECT tier FROM weave_open_world_domains
      WHERE client_id=${clientId}::uuid AND file_number=${owner.file_number} LIMIT 1
    `
    if(isTier(domain?.tier))tier=domain.tier
  }
  if(tables?.purchases){
    const [purchase]=await sql`
      SELECT file_folder_tier,amount_trx,amount_usdt,payment_method
      FROM file_folder_purchases WHERE client_id=${clientId}::uuid
        AND file_number=${owner.file_number} AND status='confirmed'
      ORDER BY confirmed_at DESC NULLS LAST,created_at DESC LIMIT 1
    `
    if(purchase){
      const requested=isTier(purchase.file_folder_tier)?purchase.file_folder_tier:null
      const verified:FileFolderTier|null=requested==='plus'
        ? (((purchase.payment_method==='trx'&&Number(purchase.amount_trx)===FILE_FOLDER_PRICING.plusTrx)||
            (purchase.payment_method==='usdt'&&Number(purchase.amount_usdt)===FILE_FOLDER_PRICING.plusUsdt))?'plus':null)
        : getFileFolderTier(Number(purchase.amount_trx),requested)
      if(verified&&(!tier||higher(verified,tier)))tier=verified
    }
  }
  if(!tier&&tables?.deposits){
    const [deposit]=await sql`
      SELECT tier_trx FROM bridge_deposits WHERE file_number=${owner.file_number} AND status='approved'
      ORDER BY verified_at DESC NULLS LAST,created_at DESC LIMIT 1
    `
    if(deposit){
      const amount=Number(deposit.tier_trx)
      tier=getFileFolderTier(amount,amount===FILE_FOLDER_PRICING.premiumFlameCoin?'premium':'pro')
    }
  }
  if(tables?.staff_offers){
    const [grant]=await sql`
      SELECT folder_tier FROM company_client_staff_offers
      WHERE client_id=${clientId}::uuid AND file_number=${owner.file_number} AND status='approved' LIMIT 1
    `
    if(isTier(grant?.folder_tier)&&(!tier||higher(grant.folder_tier,tier)))tier=grant.folder_tier
  }
  const upgrade=await getClientFolderUpgrade(sql,clientId,String(owner.file_number))
  if(upgrade?.status==='ready'&&isTier(upgrade.tier))tier=upgrade.tier
  // An independently verified one-time Pro activation is a genuine Pro entitlement.
  // Never downgrade an existing Premium or Plus world.
  const proActivation=await getProActivationState(clientId,String(owner.file_number))
  if(proActivation?.status==='active'&&(!tier||higher('pro',tier)))tier='pro'
  const resolvedTier=tier||'standard'
  const release=await getPublishedFileFolderRelease()
  const appearance=resolveFileFolderAppearance(resolvedTier,release?.config)
  return {
    tier:resolvedTier,
    theme:appearance.theme,
    palette:FILE_FOLDER_PALETTES[appearance.theme],
    clientName:String(owner.name||'Client'),
    businessName:String(owner.business_name||owner.name||'Client Kingdom'),
  }
}
