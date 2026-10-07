import { ensureClientBusinessStore, ensureClientBusinessStoreSchema } from '@/lib/client-business-store'
import { ensureFileFolderWorldSchema } from '@/lib/client-file-folder-world'

export const QUEEN_CLIENT_PROOF_KEY='queen_client_proof'

const PROOF_SYSTEMS=[
  {
    blueprintKey:'customer_door',
    systemType:'customer_door',
    title:'Queen Customer Door',
    publicLabel:'Queen Customer Door',
    publicSummary:'The public boundary between Queen’s private File Folder and people outside WEAVE.',
    capabilities:['Public entrance','Client identity','Customer intake','Service routing'],
  },
  {
    blueprintKey:'commerce_storefront',
    systemType:'commerce_storefront',
    title:'Queen Commerce Storefront',
    publicLabel:'Commerce Storefront',
    publicSummary:'A Client-owned storefront formed inside WEAVE for offers, customer intake, orders and fulfilment movement.',
    capabilities:['Offers','Customers','Orders','Fulfilment'],
  },
  {
    blueprintKey:'ai_service_desk',
    systemType:'ai_service_desk',
    title:'Queen AI Flame Service Desk',
    publicLabel:'AI Flame Service Desk',
    publicSummary:'AI-assisted intake and support movement with the Client remaining the human authority.',
    capabilities:['Question intake','AI assistance','Human handoff','Support record'],
  },
  {
    blueprintKey:'service_workflow',
    systemType:'service_workflow',
    title:'Queen Service Workflow',
    publicLabel:'Service Workflow',
    publicSummary:'A persistent operating path for work steps, responsibility, completion and records.',
    capabilities:['Intake','Work queue','Responsibility','Completion record'],
  },
  {
    blueprintKey:'payments_gateway',
    systemType:'payments_gateway',
    title:'Queen Payments Gateway Workshop',
    publicLabel:'Payments Gateway',
    publicSummary:'A payment-operation system for instructions, settlement records and reconciliation movement.',
    capabilities:['Payment request','Instructions','Settlement record','Reconciliation'],
  },
] as const

export async function ensureQueenClientProof(sql:any){
  await ensureFileFolderWorldSchema(sql)
  await ensureClientBusinessStoreSchema(sql)

  const [queen]=await sql`
    SELECT id,name,business_name,file_number
    FROM users
    WHERE role='client'
      AND COALESCE(is_active,true)=true
      AND (
        LOWER(TRIM(COALESCE(name,'')))='queen'
        OR LOWER(TRIM(COALESCE(business_name,'')))='queen'
      )
    ORDER BY created_at ASC
    LIMIT 1
  `
  if(!queen)return {provisioned:false,reason:'queen_client_not_found'} as const
  if(!queen.file_number)return {provisioned:false,reason:'queen_file_number_missing'} as const

  const businessName=String(queen.business_name||queen.name||'Queen').trim()||'Queen'
  const store=await ensureClientBusinessStore(sql,String(queen.id),String(queen.file_number),businessName,false)

  await sql`
    INSERT INTO client_business_formations(
      client_id,file_number,business_name,purpose,customer_description,operating_model,formation_state,created_at,updated_at
    )
    VALUES(
      ${queen.id}::uuid,
      ${queen.file_number},
      ${businessName},
      'Demonstrate a real Client-owned business boundary and connected systems formed inside WEAVE.',
      'People outside WEAVE can enter Queen’s Customer Door without creating a WEAVE account.',
      'customer_door',
      'operating',
      NOW(),NOW()
    )
    ON CONFLICT(client_id) DO UPDATE SET
      file_number=EXCLUDED.file_number,
      business_name=COALESCE(NULLIF(client_business_formations.business_name,''),EXCLUDED.business_name),
      purpose=COALESCE(NULLIF(client_business_formations.purpose,''),EXCLUDED.purpose),
      customer_description=COALESCE(NULLIF(client_business_formations.customer_description,''),EXCLUDED.customer_description),
      operating_model=COALESCE(NULLIF(client_business_formations.operating_model,''),EXCLUDED.operating_model),
      formation_state='operating',
      updated_at=NOW()
  `

  const builtSystems:any[]=[]
  for(const proof of PROOF_SYSTEMS){
    let [system]=await sql`
      SELECT id,system_type,title,configuration,status
      FROM client_built_systems
      WHERE client_id=${queen.id}::uuid
        AND file_number=${queen.file_number}
        AND system_type=${proof.systemType}
        AND status='active'
      ORDER BY activated_at ASC
      LIMIT 1
    `

    if(!system){
      const [blueprint]=await sql`
        SELECT name,description,build_hours
        FROM weave_file_folder_blueprints
        WHERE blueprint_key=${proof.blueprintKey}
        LIMIT 1
      `
      const hours=Math.max(1,Number(blueprint?.build_hours||1))
      const [build]=await sql`
        INSERT INTO client_file_folder_builds(
          client_id,file_number,blueprint_key,title,purpose,system_type,status,
          duration_hours,base_duration_minutes,duration_minutes,speed_multiplier,purchase_speed_multiplier,
          started_at,completes_at,completed_at,created_at,updated_at
        )
        VALUES(
          ${queen.id}::uuid,
          ${queen.file_number},
          ${proof.blueprintKey},
          ${proof.title},
          ${`Administration-commissioned WEAVE proof formation. ${blueprint?.description||proof.publicSummary}`},
          ${proof.systemType},
          'complete',
          ${hours},${hours*60},${hours*60},1,1,
          NOW() - make_interval(hours => ${hours}),NOW(),NOW(),NOW(),NOW()
        )
        RETURNING id
      `
      const configuration=JSON.stringify({
        weaveProof:QUEEN_CLIENT_PROOF_KEY,
        commissionedBy:'WEAVE Administration',
        owner:'client',
        publicBoundary:'customer_door',
        capabilities:[...proof.capabilities],
      })
      ;[system]=await sql`
        INSERT INTO client_built_systems(
          build_id,client_id,file_number,system_type,title,configuration,status,activated_at,updated_at
        )
        VALUES(
          ${build.id}::uuid,
          ${queen.id}::uuid,
          ${queen.file_number},
          ${proof.systemType},
          ${proof.title},
          ${configuration}::jsonb,
          'active',NOW(),NOW()
        )
        RETURNING id,system_type,title,configuration,status
      `
    }

    builtSystems.push(system)

    if(proof.systemType!=='customer_door'){
      await sql`
        INSERT INTO client_customer_door_systems(
          store_id,client_id,system_id,public_label,public_summary,enabled,published_at,created_at,updated_at
        )
        VALUES(
          ${store.id}::uuid,
          ${queen.id}::uuid,
          ${system.id}::uuid,
          ${proof.publicLabel},
          ${proof.publicSummary},
          true,NOW(),NOW(),NOW()
        )
        ON CONFLICT(store_id,system_id) DO UPDATE SET
          public_label=EXCLUDED.public_label,
          public_summary=EXCLUDED.public_summary,
          enabled=true,
          published_at=COALESCE(client_customer_door_systems.published_at,NOW()),
          updated_at=NOW()
      `
    }
  }

  const environment=JSON.stringify({
    preset:'glass_citadel',
    sign:'WEAVE PROOF DOOR',
    tagline:'A live Client Customer Door showing systems formed inside WEAVE and carried into public use.',
    marketSection:'Proof District',
    featuredMessage:'This is not a mock page. The Door is reading Queen’s active Client systems from the same File Folder records used by WEAVE.',
    platformName:'Queen',
  })

  const [opened]=await sql`
    UPDATE client_business_stores
    SET
      enabled=true,
      formation_status=CASE WHEN first_offer_published_at IS NOT NULL THEN 'selling' ELSE 'ready_for_offer' END,
      public_opened_at=COALESCE(public_opened_at,NOW()),
      description=COALESCE(NULLIF(description,''),'Queen’s live Client proof formation: Customer Door plus connected WEAVE systems.'),
      environment_config=COALESCE(environment_config,'{}'::jsonb)||${environment}::jsonb,
      updated_at=NOW()
    WHERE id=${store.id}::uuid
    RETURNING public_slug,formation_status,public_opened_at
  `

  return {
    provisioned:true,
    clientId:String(queen.id),
    fileNumber:String(queen.file_number),
    publicSlug:String(opened.public_slug),
    publicPath:`/market/${encodeURIComponent(String(opened.public_slug))}`,
    systems:builtSystems.map(system=>String(system.system_type)),
  } as const
}
