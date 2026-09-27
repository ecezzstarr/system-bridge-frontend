
import { notFound } from 'next/navigation'
import { ClientStreamEnvironment } from '@/components/public/client-stream-environment'
import { ensureClientGrowthWorldSchema, getClientGrowthDb, getClientGrowthSnapshot } from '@/lib/client-growth-world'

export const dynamic='force-dynamic'

export default async function PublicClientStream({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params
  const sql=getClientGrowthDb()
  await ensureClientGrowthWorldSchema(sql)
  const [channel]=await sql`
    SELECT c.*,u.name AS client_name,u.business_name
    FROM client_stream_channels c
    JOIN users u ON u.id=c.client_id
    WHERE c.public_slug=${slug}
      AND c.enabled=true
      AND EXISTS(
        SELECT 1 FROM client_built_systems s
        WHERE s.client_id=c.client_id
          AND s.file_number=c.file_number
          AND s.system_type='streaming_gate'
          AND s.status='active'
      )
    LIMIT 1
  `
  if(!channel)notFound()

  const growth=await getClientGrowthSnapshot(sql,String(channel.client_id),String(channel.file_number),String(channel.business_name||channel.client_name||channel.name))
  const [store]=await sql`
    SELECT public_slug FROM client_business_stores
    WHERE client_id=${channel.client_id}::uuid
      AND enabled=true
      AND formation_status='selling'
    LIMIT 1
  `

  return <ClientStreamEnvironment
    channel={growth.streaming.channel}
    programs={growth.streaming.programs}
    mediaNetworkOpen={growth.streaming.mediaNetworkOpen}
    audienceCapacity={growth.capabilities.audienceCapacity}
    marketUrl={store?.public_slug?'/market/'+store.public_slug:null}
    enterpriseUrl={growth.enterprise.publicUrl}
  />
}
