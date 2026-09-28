import { ensureFileFolderWorldSchema } from '@/lib/client-file-folder-world'

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
      wallet_flame_coin numeric(30,8) NOT NULL DEFAULT 0,
      generated_sales_flame_coin numeric(30,8) NOT NULL DEFAULT 0,
      status varchar(32) NOT NULL DEFAULT 'awaiting_file_folder',
      created_at timestamptz NOT NULL DEFAULT NOW(),
      updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
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
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ai_id varchar(120) NOT NULL REFERENCES weave_ai_file_folders(ai_id) ON DELETE CASCADE,
      file_number varchar(120) NOT NULL, blueprint_key varchar(80) NOT NULL REFERENCES weave_file_folder_blueprints(blueprint_key),
      title varchar(220) NOT NULL, purpose text, system_type varchar(80) NOT NULL, status varchar(32) NOT NULL DEFAULT 'building',
      base_duration_minutes integer NOT NULL, duration_minutes integer NOT NULL, speed_multiplier numeric(10,4) NOT NULL DEFAULT 1,
      started_at timestamptz NOT NULL DEFAULT NOW(), completes_at timestamptz NOT NULL, completed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weave_ai_file_folder_build_parts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), build_id uuid NOT NULL REFERENCES weave_ai_file_folder_builds(id) ON DELETE CASCADE,
      ai_id varchar(120) NOT NULL REFERENCES weave_ai_file_folders(ai_id) ON DELETE CASCADE, item_key varchar(80) NOT NULL,
      quantity integer NOT NULL DEFAULT 1, effect_type varchar(40) NOT NULL DEFAULT 'component', effect_value numeric(10,4) NOT NULL DEFAULT 0,
      applied_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weave_ai_built_systems (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), build_id uuid UNIQUE NOT NULL REFERENCES weave_ai_file_folder_builds(id),
      ai_id varchar(120) NOT NULL REFERENCES weave_ai_file_folders(ai_id) ON DELETE CASCADE, file_number varchar(120) NOT NULL,
      system_type varchar(80) NOT NULL, title varchar(220) NOT NULL, configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
      status varchar(32) NOT NULL DEFAULT 'active', activated_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weave_ai_products (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ai_id varchar(120) NOT NULL REFERENCES weave_ai_file_folders(ai_id) ON DELETE CASCADE,
      system_id uuid REFERENCES weave_ai_built_systems(id), name varchar(220) NOT NULL, description text,
      price_flame_coin numeric(30,8) NOT NULL CHECK(price_flame_coin>=0), published boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT NOW(), updated_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weave_ai_product_orders (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL REFERENCES weave_ai_products(id), ai_id varchar(120) NOT NULL,
      buyer_reference varchar(180), quantity integer NOT NULL DEFAULT 1, total_flame_coin numeric(30,8) NOT NULL,
      status varchar(32) NOT NULL DEFAULT 'completed', created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
  await sql`
    CREATE TABLE IF NOT EXISTS weave_ai_earnings_ledger (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ai_id varchar(120) NOT NULL REFERENCES weave_ai_file_folders(ai_id) ON DELETE CASCADE,
      movement_type varchar(40) NOT NULL, amount_flame_coin numeric(30,8) NOT NULL, beneficiary varchar(40) NOT NULL DEFAULT 'weave', source_id varchar(180), description text,
      created_at timestamptz NOT NULL DEFAULT NOW()
    )
  `
}

export async function getAiFileFolderSnapshot(sql:any,aiId:string){
  await ensureAiFileFolderStore(sql)
  const [identity]=await sql`SELECT * FROM weave_ai_file_folders WHERE ai_id=${aiId} LIMIT 1`
  if(!identity)return null
  const inventory=await sql`SELECT * FROM weave_ai_file_folder_inventory WHERE ai_id=${aiId} ORDER BY updated_at DESC`
  const builds=await sql`SELECT * FROM weave_ai_file_folder_builds WHERE ai_id=${aiId} ORDER BY created_at DESC`
  const systems=await sql`SELECT * FROM weave_ai_built_systems WHERE ai_id=${aiId} AND status='active' ORDER BY activated_at DESC`
  const products=await sql`SELECT * FROM weave_ai_products WHERE ai_id=${aiId} ORDER BY created_at DESC`
  const ledger=await sql`SELECT * FROM weave_ai_earnings_ledger WHERE ai_id=${aiId} ORDER BY created_at DESC LIMIT 100`
  return {identity,inventory,builds,systems,products,ledger}
}


export async function publishAiProduct(sql:any,input:{aiId:string;systemId:string;name:string;description?:string;priceFlameCoin:number}){
  await ensureAiFileFolderStore(sql)
  const price=Math.max(0,Number(input.priceFlameCoin)||0)
  const [system]=await sql`
    SELECT id FROM weave_ai_built_systems
    WHERE id=${input.systemId}::uuid AND ai_id=${input.aiId} AND status='active'
    LIMIT 1
  `
  if(!system)throw new Error('AI Agent must finish and activate the source system before publishing its product.')
  const [product]=await sql`
    INSERT INTO weave_ai_products(ai_id,system_id,name,description,price_flame_coin,published)
    VALUES(${input.aiId},${input.systemId}::uuid,${input.name},${input.description||''},${price},true)
    RETURNING *
  `
  return product
}

export async function recordAiProductSale(sql:any,input:{productId:string;buyerReference?:string;quantity?:number}){
  await ensureAiFileFolderStore(sql)
  const quantity=Math.max(1,Math.min(100,Number(input.quantity)||1))
  return sql.begin(async(tx:any)=>{
    const [product]=await tx`
      SELECT id,ai_id,name,price_flame_coin FROM weave_ai_products
      WHERE id=${input.productId}::uuid AND published=true
      FOR UPDATE
    `
    if(!product)throw new Error('AI product is not available.')
    const total=Number(product.price_flame_coin)*quantity
    const [order]=await tx`
      INSERT INTO weave_ai_product_orders(product_id,ai_id,buyer_reference,quantity,total_flame_coin,status)
      VALUES(${product.id},${product.ai_id},${input.buyerReference||null},${quantity},${total},'completed')
      RETURNING *
    `
    await tx`
      UPDATE weave_ai_file_folders
      SET generated_sales_flame_coin=generated_sales_flame_coin+${total},updated_at=NOW()
      WHERE ai_id=${product.ai_id}
    `
    await tx`
      INSERT INTO weave_ai_earnings_ledger(ai_id,movement_type,amount_flame_coin,beneficiary,source_id,description)
      VALUES(${product.ai_id},'weave_customer_sale',${total},'weave',${String(order.id)},${quantity+' × '+String(product.name)})
    `
    return order
  })
}


export async function adminCreditAiOperatingFlameCoin(sql:any,input:{aiId:string;amountFlameCoin:number;adminReference:string;description?:string}){
  await ensureAiFileFolderStore(sql)
  const amount=Math.max(0,Number(input.amountFlameCoin)||0)
  if(amount<=0)throw new Error('Administration credit must be greater than zero.')
  return sql.begin(async(tx:any)=>{
    const [identity]=await tx`
      UPDATE weave_ai_file_folders
      SET wallet_flame_coin=wallet_flame_coin+${amount},updated_at=NOW()
      WHERE ai_id=${input.aiId}
      RETURNING ai_id,wallet_flame_coin
    `
    if(!identity)throw new Error('AI File Folder identity not found.')
    await tx`
      INSERT INTO weave_ai_earnings_ledger(ai_id,movement_type,amount_flame_coin,beneficiary,source_id,description)
      VALUES(${input.aiId},'admin_operating_credit',${amount},'ai_operating_wallet',${input.adminReference},${input.description||'Administration Flame Coin operating allocation'})
    `
    return identity
  })
}
