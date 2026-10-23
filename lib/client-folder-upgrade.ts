import { sql } from '@/lib/db'
import { CJ_DORADO_FILE_NUMBER } from '@/lib/client-file-folder'

export const CJ_PRO_FOLDER_NUMBER=CJ_DORADO_FILE_NUMBER
export type ClientFolderUpgradeStatus='construction'|'repayment_required'|'ready'

export async function ensureClientFolderUpgrades(){
  await sql`CREATE TABLE IF NOT EXISTS client_folder_upgrades(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id uuid UNIQUE NOT NULL REFERENCES users(id),
    file_number varchar(120) UNIQUE NOT NULL,
    tier varchar(16) NOT NULL CHECK(tier IN ('standard','pro','premium','plus')),
    status varchar(32) NOT NULL CHECK(status IN ('construction','repayment_required','ready')),
    loan_principal_usdt numeric(16,2) NOT NULL DEFAULT 0,
    loan_funded_at timestamptz,
    loan_funding_reference varchar(255),
    loan_agreed_at timestamptz,
    repayment_verified_usdt numeric(16,2) NOT NULL DEFAULT 0,
    construction_note text NOT NULL,
    prepared_by uuid REFERENCES users(id),
    approved_by uuid REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CHECK(loan_principal_usdt>=0),
    CHECK(repayment_verified_usdt>=0 AND repayment_verified_usdt<=loan_principal_usdt)
  )`
  await sql`CREATE TABLE IF NOT EXISTS client_folder_loan_repayments(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    upgrade_id uuid NOT NULL REFERENCES client_folder_upgrades(id),
    amount_usdt numeric(16,2) NOT NULL CHECK(amount_usdt>0),
    network varchar(80) NOT NULL,
    reference varchar(255) NOT NULL UNIQUE,
    verified_by uuid NOT NULL REFERENCES users(id),
    verified_at timestamptz NOT NULL DEFAULT now()
  )`
}

export function clientUpgradePublicView(row:any){
  if(!row)return null
  const principal=Number(row.loan_principal_usdt||0)
  const verified=Number(row.repayment_verified_usdt||0)
  const funded=Boolean(row.loan_funded_at&&row.loan_agreed_at)
  return {
    fileNumber:String(row.file_number),tier:String(row.tier),
    status:row.status as ClientFolderUpgradeStatus,
    worldStatus:row.status==='ready'?'ready':'construction',
    loan:{currency:'USDT',principal,verified,
      remaining:funded?Math.max(0,Math.round((principal-verified)*100)/100):null,
      agreementConfirmed:Boolean(row.loan_agreed_at),
      fundingConfirmed:Boolean(row.loan_funded_at),
      display:funded&&principal>verified
        ?'Remaining personal loan: '+(principal-verified).toFixed(2)+' USDT. Verified repayment is required before entry.'
        :'Pro File Folder construction is recorded. Personal loan terms and actual funding require confirmation before any repayment is due.',
    },
    notice:row.status==='ready'
      ?'Your Pro File Folder is ready.'
      :'Your Pro File Folder world is under construction. Entry remains closed until the verified personal-loan repayment and Administration release.',
    constructionNote:String(row.construction_note||'The Pro File Folder world is being formed.'),
  }
}

export async function getClientFolderUpgrade(sqlAdapter:any,clientId:string,fileNumber:string){
  const [table]=await sqlAdapter`SELECT to_regclass('public.client_folder_upgrades') AS name`
  if(!table?.name)return null
  const [row]=await sqlAdapter`
    SELECT id,file_number,tier,status,loan_principal_usdt,
      loan_agreed_at,loan_funded_at,repayment_verified_usdt,construction_note
    FROM client_folder_upgrades
    WHERE client_id=${clientId}::uuid AND file_number=${fileNumber} LIMIT 1
  `
  return row||null
}
