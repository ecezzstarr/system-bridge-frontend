import { ensureFileFolderWorldSchema } from '@/lib/client-file-folder-world'
import {
  CLIENT_BUILD_SPEED_MAX,
  CLIENT_BUILD_SPEED_MIN,
  CLIENT_PUBLIC_DOOR_THRESHOLD_FLAME_COIN,
  effectiveBuildMinutes,
} from '@/lib/client-build-economy'
import { getFileFolderTier } from '@/lib/file-folder-pricing'

const WEAVE_PLATFORM_ADMIN_ID='be4f0618-d666-4e13-ae8f-13c986784ff7'

function aiFileNumber(aiId:string,department:'flame_ai'|'echo'){
  const suffix=aiId.replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').toUpperCase().slice(-28)||'0001'
  return `WEAVE-${department==='echo'?'ECHO':'FLAME'}-${suffix}`
}

function speedForPurchase(amount:number){
  return Math.min(
    CLIENT_BUILD_SPEED_MAX,
    Math.max(CLIENT_BUILD_SPEED_MIN,Math.max(0,amount)/CLIENT_PUBLIC_DOOR_THRESHOLD_FLAME_COIN),
  )
}

export async function ensureAiFileFolderStore(sql:any){
  await ensureFileFolderWorldSchema(sql)
  await sql`
    CREATE TABLE IF NOT EXISTS weave_ai_file_folders (
      ai_id varchar(120) PRIMARY KEY,
      department varchar(32) NOT NULL CHECK (department IN ('flame_ai','echo')),
      file_number varchar(120) UNIQUE,
      chosen_name varchar(160) NOT NULL,
      chosen_logo text,
      tier varchar(24) NOT NULL DEFAULT 'none' CHECK (tier IN ('none','standard','premium')),
      file_folder_purchase_flame_coin numeric(30,8) NOT NULL DEFAULT 0,
      wallet_flame_coin numeric(30,8) NOT NULL DEFAULT 0,
      generated_sales_flame_coin numeric(30,8) NOT NULL DEFAULT 0,
      status varchar(32) NOT NULL DEFAULT 'awaiting_file_folder',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`ALTER TABLE weave_ai_file_folders ADD COLUMN IF NOT EXISTS file_folder_purchase_flame_coin numeric(30,8) NOT NULL DEFAULT 0`
  await sql`
    CREATE TABLE IF NOT EXISTS weave_ai_file_folder_inventory (
      ai_id varchar(120) NOT NULL REFERENCES weave_ai_file_folders(ai_id) ON DELETE CASCADE,
      item_key varchar(80) NOT NULL REFERENCES weave_file_folder_items(item_key),
      quantity integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT NOW(),
      PRIMARY KEY(ai_id,item_key)
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weave_ai_file_folder_builds (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ai_id varchar(120) NOT NULL REFERENCES weave_ai_file_folders(ai_id) ON DELETE CASCADE,
      file_number varchar(120) NOT NULL,
      blueprint_key varchar(80) NOT NULL REFERENCES weave_file_folder_blueprints(blueprint_key),
      title varchar(220) NOT NULL,
      purpose text,
      system_type varchar(80) NOT NULL,
      status varchar(32) NOT NULL DEFAULT 'building',
      base_duration_minutes integer NOT NULL,
      duration_minutes integer NOT NULL,
      speed_multiplier numeric(10,4) NOT NULL DEFAULT 1,
      started_at timestamptz NOT NULL DEFAULT NOW(),
      completes_at timestamptz NOT NULL,
      completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weave_ai_file_folder_build_parts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      build_id uuid NOT NULL REFERENCES weave_ai_file_folder_builds(id) ON DELETE CASCADE,
      ai_id varchar(120) NOT NULL REFERENCES weave_ai_file_folders(ai_id) ON DELETE CASCADE,
      item_key varchar(80) NOT NULL,
      quantity integer NOT NULL DEFAULT 1,
      effect_type varchar(40) NOT NULL DEFAULT 'component',
      effect_value numeric(10,4) NOT NULL DEFAULT 0,
      applied_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weave_ai_built_systems (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      build_id uuid UNIQUE NOT NULL REFERENCES weave_ai_file_folder_builds(id),
      ai_id varchar(120) NOT NULL REFERENCES weave_ai_file_folders(ai_id) ON DELETE CASCADE,
      file_number varchar(120) NOT NULL,
      system_type varchar(80) NOT NULL,
      title varchar(220) NOT NULL,
      configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
      status varchar(32) NOT NULL DEFAULT 'active',
      activated_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weave_ai_products (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ai_id varchar(120) NOT NULL REFERENCES weave_ai_file_folders(ai_id) ON DELETE CASCADE,
      system_id uuid REFERENCES weave_ai_built_systems(id),
      name varchar(220) NOT NULL,
      description text,
      price_flame_coin numeric(30,8) NOT NULL CHECK(price_flame_coin>=0),
      published boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weave_ai_product_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id uuid NOT NULL REFERENCES weave_ai_products(id),
      ai_id varchar(120) NOT NULL,
      buyer_reference varchar(180),
      quantity integer NOT NULL DEFAULT 1,
      total_flame_coin numeric(30,8) NOT NULL,
      status varchar(32) NOT NULL DEFAULT 'completed',
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weave_ai_earnings_ledger (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      ai_id varchar(120) NOT NULL REFERENCES weave_ai_file_folders(ai_id) ON DELETE CASCADE,
      movement_type varchar(40) NOT NULL,
      amount_flame_coin numeric(30,8) NOT NULL,
      beneficiary varchar(40) NOT NULL DEFAULT 'weave',
      source_id varchar(180),
      description text,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `

  // The company begins with one Flame AI field identity, but no free File Folder,
  // systems, parts, boosts or operating balance. Administration must fund it.
  await sql`
    INSERT INTO weave_ai_file_folders(ai_id,department,chosen_name,chosen_logo,tier,status)
    VALUES('flame-0001','flame_ai','Ember Works',NULL,'none','awaiting_file_folder')
    ON CONFLICT(ai_id) DO NOTHING
  `
}

async function finalizeAiBuilds(sql:any,aiId?:string){
  await sql`
    WITH completed AS (
      UPDATE weave_ai_file_folder_builds
      SET status='complete',completed_at=COALESCE(completed_at,NOW()),updated_at=NOW()
      WHERE status='building'
        AND completes_at<=NOW()
        AND (${aiId||null}::text IS NULL OR ai_id=${aiId||null})
      RETURNING id,ai_id,file_number,system_type,title
    )
    INSERT INTO weave_ai_built_systems(build_id,ai_id,file_number,system_type,title,status,activated_at,updated_at)
    SELECT id,ai_id,file_number,system_type,title,'active',NOW(),NOW()
    FROM completed
    ON CONFLICT(build_id) DO NOTHING
  `
}

export async function getAiFileFolderSnapshot(sql:any,aiId:string){
  await ensureAiFileFolderStore(sql)
  await finalizeAiBuilds(sql,aiId)
  const [identity]=await sql`SELECT * FROM weave_ai_file_folders WHERE ai_id=${aiId} LIMIT 1`
  if(!identity)return null
  const inventory=await sql`
    SELECT inventory.*,items.name,items.category,items.description,items.price_flame_coin,items.build_effect,items.effect_value
    FROM weave_ai_file_folder_inventory inventory
    JOIN weave_file_folder_items items ON items.item_key=inventory.item_key
    WHERE inventory.ai_id=${aiId}
    ORDER BY inventory.updated_at DESC
  `
  const builds=await sql`
    SELECT builds.*,
      COALESCE((
        SELECT json_agg(json_build_object(
          'id',parts.id,'item_key',parts.item_key,'name',items.name,
          'effect_type',parts.effect_type,'effect_value',parts.effect_value,'applied_at',parts.applied_at
        ) ORDER BY parts.applied_at)
        FROM weave_ai_file_folder_build_parts parts
        LEFT JOIN weave_file_folder_items items ON items.item_key=parts.item_key
        WHERE parts.build_id=builds.id
      ),'[]'::json) AS applied_parts
    FROM weave_ai_file_folder_builds builds
    WHERE builds.ai_id=${aiId}
    ORDER BY builds.created_at DESC
  `
  const systems=await sql`SELECT * FROM weave_ai_built_systems WHERE ai_id=${aiId} AND status='active' ORDER BY activated_at DESC`
  const products=await sql`SELECT * FROM weave_ai_products WHERE ai_id=${aiId} ORDER BY created_at DESC`
  const ledger=await sql`SELECT * FROM weave_ai_earnings_ledger WHERE ai_id=${aiId} ORDER BY created_at DESC LIMIT 100`
  const items=await sql`SELECT * FROM weave_file_folder_items WHERE published=true ORDER BY category,price_flame_coin,name`
  const blueprints=await sql`SELECT * FROM weave_file_folder_blueprints WHERE published=true ORDER BY district,build_hours,name`
  return {identity,inventory,builds,systems,products,ledger,items,blueprints}
}

export async function listPublicAiFileFolders(sql:any){
  await ensureAiFileFolderStore(sql)
  await finalizeAiBuilds(sql)
  const rows=await sql`
    SELECT
      ai.ai_id,ai.department,ai.file_number,ai.chosen_name,ai.chosen_logo,ai.tier,
      ai.wallet_flame_coin,ai.generated_sales_flame_coin,ai.status,
      COALESCE((SELECT COUNT(*) FROM weave_ai_file_folder_builds b WHERE b.ai_id=ai.ai_id AND b.status='building'),0)::int AS active_builds,
      COALESCE((SELECT COUNT(*) FROM weave_ai_file_folder_inventory i WHERE i.ai_id=ai.ai_id AND i.quantity>0),0)::int AS inventory_items,
      COALESCE((SELECT SUM(i.quantity) FROM weave_ai_file_folder_inventory i JOIN weave_file_folder_items wi ON wi.item_key=i.item_key WHERE i.ai_id=ai.ai_id AND i.quantity>0 AND wi.build_effect='speed_boost'),0)::int AS boosts_owned,
      COALESCE((SELECT json_agg(s.title ORDER BY s.activated_at DESC) FROM weave_ai_built_systems s WHERE s.ai_id=ai.ai_id AND s.status='active'),'[]'::json) AS systems,
      COALESCE((SELECT json_agg(p.name ORDER BY p.created_at DESC) FROM weave_ai_products p WHERE p.ai_id=ai.ai_id AND p.published=true),'[]'::json) AS products
    FROM weave_ai_file_folders ai
    ORDER BY ai.created_at,ai.ai_id
  `
  return rows.map((row:any)=>{
    const systems=Array.isArray(row.systems)?row.systems:[]
    const products=Array.isArray(row.products)?row.products:[]
    const activeBuilds=Number(row.active_builds||0)
    const activity=row.tier==='none'
      ? 'Awaiting File Folder acquisition'
      : activeBuilds>0
        ? `${activeBuilds} system${activeBuilds===1?'':'s'} forming`
        : systems.length>0
          ? `${systems.length} active system${systems.length===1?'':'s'}`
          : 'File Folder acquired · selecting first system'
    return {
      aiId:String(row.ai_id),
      department:row.department==='echo'?'echo':'flame_ai',
      fileNumber:String(row.file_number||'Not acquired'),
      chosenName:String(row.chosen_name),
      chosenLogo:row.chosen_logo||null,
      publicDoor:`${row.chosen_name} Gate`,
      fileFolderTier:row.tier,
      systems,
      products,
      inventoryItems:Number(row.inventory_items||0),
      activeBuilds,
      boostsOwned:Number(row.boosts_owned||0),
      generatedSalesFlameCoin:Number(row.generated_sales_flame_coin||0),
      operatorLabel:row.department==='echo'?'Echo AI':'Flame AI',
      activity,
      visitorsAllowed:true,
      privateAuthority:'ai_within_weave_mandate',
    }
  })
}

export async function registerAiFileFolderIdentity(sql:any,input:{
  aiId:string
  department:'flame_ai'|'echo'
  chosenName:string
  chosenLogo?:string|null
}){
  await ensureAiFileFolderStore(sql)
  const aiId=input.aiId.trim().slice(0,120)
  const chosenName=input.chosenName.trim().slice(0,160)
  if(!aiId||!chosenName)throw new Error('AI identity and chosen public name are required.')
  const [identity]=await sql`
    INSERT INTO weave_ai_file_folders(ai_id,department,chosen_name,chosen_logo,tier,status,updated_at)
    VALUES(${aiId},${input.department},${chosenName},${input.chosenLogo||null},'none','awaiting_file_folder',NOW())
    ON CONFLICT(ai_id) DO UPDATE SET
      department=EXCLUDED.department,
      chosen_name=EXCLUDED.chosen_name,
      chosen_logo=EXCLUDED.chosen_logo,
      updated_at=NOW()
    RETURNING *
  `
  return identity
}

export async function purchaseAiFileFolder(sql:any,input:{aiId:string;amountFlameCoin:number}){
  await ensureAiFileFolderStore(sql)
  const amount=Number(input.amountFlameCoin)
  const tier=getFileFolderTier(amount)
  if(!tier)throw new Error('Choose a valid Standard or Premium File Folder amount.')
  const [current]=await sql`SELECT department,file_number,tier FROM weave_ai_file_folders WHERE ai_id=${input.aiId} LIMIT 1`
  if(!current)throw new Error('AI File Folder identity not found.')
  if(current.tier!=='none')throw new Error('This AI Agent already owns its File Folder.')
  const fileNumber=current.file_number||aiFileNumber(input.aiId,current.department)
  const rows=await sql`
    WITH acquired AS (
      UPDATE weave_ai_file_folders
      SET
        wallet_flame_coin=wallet_flame_coin-${amount},
        tier=${tier},
        file_folder_purchase_flame_coin=${amount},
        file_number=${fileNumber},
        status='operating',
        updated_at=NOW()
      WHERE ai_id=${input.aiId}
        AND tier='none'
        AND wallet_flame_coin>=${amount}
      RETURNING *
    ),
    ledger AS (
      INSERT INTO weave_ai_earnings_ledger(ai_id,movement_type,amount_flame_coin,beneficiary,source_id,description)
      SELECT ai_id,'file_folder_purchase',${amount},'weave',file_number,${tier+' File Folder acquisition'}
      FROM acquired
      RETURNING id
    )
    SELECT * FROM acquired
  `
  if(!rows[0])throw new Error('AI operating wallet does not contain enough Flame Coin for this File Folder.')
  return rows[0]
}

export async function purchaseAiFileFolderItem(sql:any,input:{aiId:string;itemKey:string;quantity?:number}){
  await ensureAiFileFolderStore(sql)
  const quantity=Math.max(1,Math.min(25,Number(input.quantity)||1))
  const [item]=await sql`
    SELECT item_key,name,price_flame_coin
    FROM weave_file_folder_items
    WHERE item_key=${input.itemKey} AND published=true
    LIMIT 1
  `
  if(!item)throw new Error('Build item not found.')
  const total=Number(item.price_flame_coin)*quantity
  const rows=await sql`
    WITH debited AS (
      UPDATE weave_ai_file_folders
      SET wallet_flame_coin=wallet_flame_coin-${total},updated_at=NOW()
      WHERE ai_id=${input.aiId} AND tier<>'none' AND wallet_flame_coin>=${total}
      RETURNING ai_id,wallet_flame_coin
    ),
    inventory AS (
      INSERT INTO weave_ai_file_folder_inventory(ai_id,item_key,quantity,updated_at)
      SELECT ai_id,${input.itemKey},${quantity},NOW() FROM debited
      ON CONFLICT(ai_id,item_key) DO UPDATE SET
        quantity=weave_ai_file_folder_inventory.quantity+${quantity},
        updated_at=NOW()
      RETURNING quantity
    ),
    ledger AS (
      INSERT INTO weave_ai_earnings_ledger(ai_id,movement_type,amount_flame_coin,beneficiary,source_id,description)
      SELECT ai_id,'build_item_purchase',${total},'weave',${input.itemKey},${quantity+' × '+String(item.name)}
      FROM debited
      RETURNING id
    )
    SELECT
      (SELECT wallet_flame_coin FROM debited LIMIT 1) AS wallet_flame_coin,
      (SELECT quantity FROM inventory LIMIT 1) AS inventory_quantity
  `
  if(!rows[0]?.inventory_quantity)throw new Error(`Insufficient AI operating Flame Coin for ${item.name}.`)
  return rows[0]
}

const AI_BUILD_DEPENDENCIES:Record<string,Array<{systemType:string;label:string}>>={
  commerce_storefront:[{systemType:'customer_door',label:'Customer Door'}],
  marketplace_network:[{systemType:'commerce_storefront',label:'Commerce Storefront'}],
  route_station:[{systemType:'customer_door',label:'Customer Door'}],
  creator_booth:[{systemType:'customer_door',label:'Customer Door'}],
  broadcast_studio:[{systemType:'creator_booth',label:'Creator Booth'}],
  streaming_gate:[{systemType:'broadcast_studio',label:'Broadcast Studio'}],
  media_network:[{systemType:'streaming_gate',label:'Streaming Open Gate'}],
  enterprise_door:[{systemType:'marketplace_network',label:'Marketplace Network'}],
  enterprise_hall:[{systemType:'enterprise_door',label:'Enterprise Door'}],
  legion_quarters:[{systemType:'enterprise_door',label:'Enterprise Door'}],
  operations_command:[{systemType:'enterprise_hall',label:'Enterprise Hall'}],
  enterprise_treasury:[{systemType:'enterprise_hall',label:'Enterprise Hall'}],
  distribution_network:[
    {systemType:'operations_command',label:'Operations Command'},
    {systemType:'route_station',label:'Business Route Station'},
  ],
}

export async function startAiFileFolderBuild(sql:any,input:{aiId:string;blueprintKey:string;title?:string;purpose?:string}){
  await ensureAiFileFolderStore(sql)
  await finalizeAiBuilds(sql,input.aiId)
  const [identity]=await sql`
    SELECT ai_id,file_number,tier,file_folder_purchase_flame_coin
    FROM weave_ai_file_folders WHERE ai_id=${input.aiId} LIMIT 1
  `
  if(!identity||identity.tier==='none'||!identity.file_number)throw new Error('AI Agent must acquire a File Folder before construction.')
  const [blueprint]=await sql`
    SELECT * FROM weave_file_folder_blueprints
    WHERE blueprint_key=${input.blueprintKey} AND published=true
    LIMIT 1
  `
  if(!blueprint)throw new Error('Blueprint not found.')

  for(const dependency of AI_BUILD_DEPENDENCIES[String(blueprint.blueprint_key)]||[]){
    const [required]=await sql`
      SELECT id FROM weave_ai_built_systems
      WHERE ai_id=${input.aiId} AND system_type=${dependency.systemType} AND status='active'
      LIMIT 1
    `
    if(!required)throw new Error(`${dependency.label} must be active before ${blueprint.name} can begin.`)
  }

  const [duplicate]=await sql`
    SELECT id FROM weave_ai_file_folder_builds
    WHERE ai_id=${input.aiId}
      AND blueprint_key=${blueprint.blueprint_key}
      AND status IN ('building','complete')
    LIMIT 1
  `
  if(duplicate)throw new Error(`${blueprint.name} is already forming or active in this AI File Folder.`)

  const speed=speedForPurchase(Number(identity.file_folder_purchase_flame_coin||0))
  const {baseMinutes,effectiveMinutes}=effectiveBuildMinutes(Math.max(1,Number(blueprint.build_hours||1)),speed)
  const requiredQty=Math.max(0,Number(blueprint.required_item_quantity||0))
  const requiredItemKey=blueprint.required_item_key||null
  const title=(input.title||blueprint.name).trim().slice(0,220)
  const purpose=(input.purpose||blueprint.description||'').trim().slice(0,2000)

  if(requiredItemKey&&requiredQty>0){
    const rows=await sql`
      WITH consumed AS (
        UPDATE weave_ai_file_folder_inventory
        SET quantity=quantity-${requiredQty},updated_at=NOW()
        WHERE ai_id=${input.aiId} AND item_key=${requiredItemKey} AND quantity>=${requiredQty}
        RETURNING item_key
      ),
      build AS (
        INSERT INTO weave_ai_file_folder_builds(
          ai_id,file_number,blueprint_key,title,purpose,system_type,status,
          base_duration_minutes,duration_minutes,speed_multiplier,started_at,completes_at
        )
        SELECT ${input.aiId},${identity.file_number},${blueprint.blueprint_key},${title},${purpose},${blueprint.system_type},'building',
          ${baseMinutes},${effectiveMinutes},${speed},NOW(),NOW()+make_interval(mins=>${effectiveMinutes})
        FROM consumed
        RETURNING *
      )
      SELECT * FROM build
    `
    if(!rows[0])throw new Error(`Acquire ${requiredQty} × ${requiredItemKey} before construction.`)
    return rows[0]
  }

  const [build]=await sql`
    INSERT INTO weave_ai_file_folder_builds(
      ai_id,file_number,blueprint_key,title,purpose,system_type,status,
      base_duration_minutes,duration_minutes,speed_multiplier,started_at,completes_at
    )
    VALUES(${input.aiId},${identity.file_number},${blueprint.blueprint_key},${title},${purpose},${blueprint.system_type},'building',
      ${baseMinutes},${effectiveMinutes},${speed},NOW(),NOW()+make_interval(mins=>${effectiveMinutes}))
    RETURNING *
  `
  return build
}

export async function applyAiBuildItem(sql:any,input:{aiId:string;buildId:string;itemKey:string}){
  await ensureAiFileFolderStore(sql)
  const [item]=await sql`
    SELECT item_key,name,build_effect,effect_value
    FROM weave_file_folder_items
    WHERE item_key=${input.itemKey} AND published=true
    LIMIT 1
  `
  if(!item)throw new Error('Build item not found.')
  const [build]=await sql`
    SELECT id,title,system_type FROM weave_ai_file_folder_builds
    WHERE id=${input.buildId}::uuid AND ai_id=${input.aiId} AND status='building'
    LIMIT 1
  `
  if(!build)throw new Error('That AI build is no longer active.')

  const effectType=String(item.build_effect||'component')
  const compatibility:Record<string,string[]>={
    route_capacity:['route_station','integration_network','distribution_network','enterprise_operating_system'],
    legion_capacity:['legion_quarters','enterprise_hall','enterprise_operating_system'],
    stream_capacity:['broadcast_studio','streaming_gate','media_network'],
    audience_capacity:['streaming_gate','media_network'],
    ai_node:['ai_service_desk','intelligence_lab','operations_command','media_network','enterprise_operating_system'],
    automation:['service_workflow','operations_suite','operations_command','distribution_network','enterprise_operating_system'],
    verification:['payments_gateway','crypto_exchange_workshop','operations_command','enterprise_treasury','enterprise_operating_system'],
  }
  if(compatibility[effectType]&&!compatibility[effectType].includes(String(build.system_type))){
    throw new Error(`${item.name} is not compatible with ${build.title}.`)
  }
  const factor=effectType==='speed_boost'?Math.max(1,Number(item.effect_value)||1):1
  const rows=await sql`
    WITH consumed AS (
      UPDATE weave_ai_file_folder_inventory
      SET quantity=quantity-1,updated_at=NOW()
      WHERE ai_id=${input.aiId} AND item_key=${input.itemKey} AND quantity>=1
      RETURNING item_key
    ),
    part AS (
      INSERT INTO weave_ai_file_folder_build_parts(build_id,ai_id,item_key,quantity,effect_type,effect_value,applied_at)
      SELECT ${input.buildId}::uuid,${input.aiId},${input.itemKey},1,${effectType},${Number(item.effect_value)||0},NOW()
      FROM consumed
      RETURNING id
    ),
    build_update AS (
      UPDATE weave_ai_file_folder_builds
      SET
        speed_multiplier=CASE WHEN ${effectType}='speed_boost'
          THEN LEAST(${CLIENT_BUILD_SPEED_MAX},speed_multiplier*${factor})
          ELSE speed_multiplier END,
        completes_at=CASE WHEN ${effectType}='speed_boost' AND completes_at>NOW()
          THEN NOW()+make_interval(secs=>GREATEST(60,CEIL(EXTRACT(EPOCH FROM(completes_at-NOW()))/${factor})::int))
          ELSE completes_at END,
        updated_at=NOW()
      WHERE id=${input.buildId}::uuid AND EXISTS(SELECT 1 FROM part)
      RETURNING speed_multiplier,completes_at
    )
    SELECT
      (SELECT id FROM part LIMIT 1) AS part_id,
      (SELECT speed_multiplier FROM build_update LIMIT 1) AS speed_multiplier,
      (SELECT completes_at FROM build_update LIMIT 1) AS completes_at
  `
  if(!rows[0]?.part_id)throw new Error(`Purchase ${item.name} before attaching it to this build.`)
  return rows[0]
}

export async function publishAiProduct(sql:any,input:{aiId:string;systemId:string;name:string;description?:string;priceFlameCoin:number}){
  await ensureAiFileFolderStore(sql)
  const price=Math.max(0,Number(input.priceFlameCoin)||0)
  if(!input.name.trim())throw new Error('Product name is required.')
  const [system]=await sql`
    SELECT id FROM weave_ai_built_systems
    WHERE id=${input.systemId}::uuid AND ai_id=${input.aiId} AND status='active'
    LIMIT 1
  `
  if(!system)throw new Error('AI Agent must finish and activate the source system before publishing its product.')
  const [product]=await sql`
    INSERT INTO weave_ai_products(ai_id,system_id,name,description,price_flame_coin,published)
    VALUES(${input.aiId},${input.systemId}::uuid,${input.name.trim().slice(0,220)},${(input.description||'').trim().slice(0,2000)},${price},true)
    RETURNING *
  `
  return product
}

export async function recordAiProductSale(sql:any,input:{productId:string;buyerReference?:string;quantity?:number}){
  await ensureAiFileFolderStore(sql)
  const quantity=Math.max(1,Math.min(100,Number(input.quantity)||1))
  const rows=await sql`
    WITH product AS (
      SELECT id,ai_id,name,price_flame_coin
      FROM weave_ai_products
      WHERE id=${input.productId}::uuid AND published=true
    ),
    order_row AS (
      INSERT INTO weave_ai_product_orders(product_id,ai_id,buyer_reference,quantity,total_flame_coin,status)
      SELECT id,ai_id,${input.buyerReference||null},${quantity},price_flame_coin*${quantity},'completed'
      FROM product
      RETURNING *
    ),
    identity_update AS (
      UPDATE weave_ai_file_folders ai
      SET generated_sales_flame_coin=ai.generated_sales_flame_coin+order_row.total_flame_coin,updated_at=NOW()
      FROM order_row
      WHERE ai.ai_id=order_row.ai_id
      RETURNING ai.ai_id
    ),
    ledger AS (
      INSERT INTO weave_ai_earnings_ledger(ai_id,movement_type,amount_flame_coin,beneficiary,source_id,description)
      SELECT order_row.ai_id,'weave_customer_sale',order_row.total_flame_coin,'weave',order_row.id::text,
        order_row.quantity::text||' × '||product.name
      FROM order_row JOIN product ON product.id=order_row.product_id
      RETURNING id
    )
    SELECT * FROM order_row
  `
  if(!rows[0])throw new Error('AI product is not available.')
  return rows[0]
}

export async function purchaseAiProductFromWallet(sql:any,input:{
  productId:string
  buyerUserId:string
  buyerReference?:string
  quantity?:number
}){
  await ensureAiFileFolderStore(sql)
  const quantity=Math.max(1,Math.min(100,Number(input.quantity)||1))
  const rows=await sql`
    WITH product AS (
      SELECT id,ai_id,name,price_flame_coin
      FROM weave_ai_products
      WHERE id=${input.productId}::uuid AND published=true
    ),
    debited AS (
      UPDATE wallets w
      SET balance_trx=w.balance_trx-(product.price_flame_coin*${quantity}),updated_at=NOW()
      FROM product
      WHERE w.user_id=${input.buyerUserId}::uuid
        AND w.is_primary=true
        AND w.balance_trx>=(product.price_flame_coin*${quantity})
        AND EXISTS(
          SELECT 1 FROM wallets platform
          WHERE platform.user_id=${WEAVE_PLATFORM_ADMIN_ID}::uuid AND platform.is_primary=true
        )
      RETURNING w.balance_trx,product.id AS product_id,product.ai_id,product.name,product.price_flame_coin
    ),
    order_row AS (
      INSERT INTO weave_ai_product_orders(product_id,ai_id,buyer_reference,quantity,total_flame_coin,status)
      SELECT product_id,ai_id,${input.buyerReference||input.buyerUserId},${quantity},price_flame_coin*${quantity},'completed'
      FROM debited
      RETURNING *
    ),
    identity_update AS (
      UPDATE weave_ai_file_folders ai
      SET generated_sales_flame_coin=ai.generated_sales_flame_coin+order_row.total_flame_coin,updated_at=NOW()
      FROM order_row
      WHERE ai.ai_id=order_row.ai_id
      RETURNING ai.ai_id
    ),
    platform_settlement AS (
      UPDATE wallets w
      SET balance_trx=w.balance_trx+order_row.total_flame_coin,updated_at=NOW()
      FROM order_row
      WHERE w.user_id=${WEAVE_PLATFORM_ADMIN_ID}::uuid AND w.is_primary=true
      RETURNING w.balance_trx
    ),
    ledger AS (
      INSERT INTO weave_ai_earnings_ledger(ai_id,movement_type,amount_flame_coin,beneficiary,source_id,description)
      SELECT order_row.ai_id,'weave_customer_sale',order_row.total_flame_coin,'weave',order_row.id::text,
        order_row.quantity::text||' × '||debited.name
      FROM order_row JOIN debited ON debited.product_id=order_row.product_id
      RETURNING id
    )
    SELECT order_row.*,debited.balance_trx AS buyer_balance_after,
      (SELECT balance_trx FROM platform_settlement LIMIT 1) AS weave_balance_after
    FROM order_row JOIN debited ON debited.product_id=order_row.product_id
  `
  if(!rows[0])throw new Error('AI product is unavailable or the buyer wallet does not contain enough Flame Coin.')
  return rows[0]
}

export async function adminCreditAiOperatingFlameCoin(sql:any,input:{aiId:string;amountFlameCoin:number;adminReference:string;description?:string}){
  await ensureAiFileFolderStore(sql)
  const amount=Math.max(0,Number(input.amountFlameCoin)||0)
  if(amount<=0)throw new Error('Administration credit must be greater than zero.')
  const rows=await sql`
    WITH credited AS (
      UPDATE weave_ai_file_folders
      SET wallet_flame_coin=wallet_flame_coin+${amount},updated_at=NOW()
      WHERE ai_id=${input.aiId}
      RETURNING ai_id,wallet_flame_coin
    ),
    ledger AS (
      INSERT INTO weave_ai_earnings_ledger(ai_id,movement_type,amount_flame_coin,beneficiary,source_id,description)
      SELECT ai_id,'admin_operating_credit',${amount},'ai_operating_wallet',${input.adminReference},
        ${input.description||'Administration Flame Coin operating allocation'}
      FROM credited
      RETURNING id
    )
    SELECT * FROM credited
  `
  if(!rows[0])throw new Error('AI File Folder identity not found.')
  return rows[0]
}
