
import { notFound } from 'next/navigation'
import { ClientEnterpriseEnvironment } from '@/components/public/client-enterprise-environment'
import { ensureEnterpriseDreamSchema, getEnterpriseDreamDb } from '@/lib/enterprise-dream'
import { ensureClientGrowthWorldSchema, getClientGrowthSnapshot } from '@/lib/client-growth-world'

export const dynamic='force-dynamic'

export default async function PublicClientEnterprise({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const sql=getEnterpriseDreamDb()
  await ensureEnterpriseDreamSchema(sql)
  await ensureClientGrowthWorldSchema(sql)
  const [enterprise]=await sql`
    SELECT a.*,u.name AS client_name,u.business_name
    FROM enterprise_applications a
    JOIN users u ON u.id=a.client_id
    WHERE a.public_slug=${slug}
      AND a.status='approved'
      AND EXISTS(
        SELECT 1 FROM client_built_systems s
        WHERE s.client_id=a.client_id
          AND s.system_type='enterprise_door'
          AND s.status='active'
      )
    LIMIT 1
  `
  if(!enterprise)notFound()

  const growth=await getClientGrowthSnapshot(sql,String(enterprise.client_id),String(enterprise.file_number),String(enterprise.business_name||enterprise.enterprise_name))
  const systems=await sql`
    SELECT id,title,system_type,activated_at,status
    FROM client_built_systems
    WHERE client_id=${enterprise.client_id}::uuid
      AND status='active'
    ORDER BY activated_at DESC
    LIMIT 80
  `
  const legions=await sql`
    SELECT id,name,function_title,livelihood_role,profit_participation
    FROM enterprise_legions
    WHERE client_id=${enterprise.client_id}::uuid
      AND active=true
    ORDER BY created_at ASC
  `
  const [store]=await sql`
    SELECT public_slug FROM client_business_stores
    WHERE client_id=${enterprise.client_id}::uuid
      AND enabled=true
      AND formation_status='selling'
    LIMIT 1
  `

  return <ClientEnterpriseEnvironment
    enterprise={enterprise}
    growth={growth}
    systems={systems}
    legions={legions}
    marketUrl={store?.public_slug?'/market/'+store.public_slug:null}
    streamUrl={growth.streaming.publicUrl}
  />
}
