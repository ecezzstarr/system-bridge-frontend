import { NextRequest,NextResponse } from 'next/server'
import { getFileFolderDb } from '@/lib/client-file-folder'
import { resolveClientToken } from '@/lib/client-vault'
import { getActiveProRegionalManager } from '@/lib/pro-regional-manager-activation'
import { ensureClientBusinessStoreSchema } from '@/lib/client-business-store'
import { ensureEnterpriseDreamSchema } from '@/lib/enterprise-dream'
import { ensureLegionCommerceSchema } from '@/lib/legion-commerce'
import { ensureFileFolderWorldSchema } from '@/lib/client-file-folder-world'
import { ensureCustomerDoorSettlementSchema } from '@/lib/customer-door-settlement'
import { getOwnerEarnings,recordOwnerCost,validOwnerCost } from '@/lib/client-owner-earnings'

const privateHeaders={'Cache-Control':'private, no-store'}
const uuid=(s:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)

async function owner(request:NextRequest){
  const sql=getFileFolderDb()
  const proRoute=request.nextUrl.pathname.startsWith('/api/pro-regional-manager/')
  let clientId:string,fileNumber:string
  if(proRoute){
    const manager=await getActiveProRegionalManager(request)
    if(!manager)return {error:NextResponse.json({error:'Verified, active Pro File Folder required'},{status:403,headers:privateHeaders})}
    clientId=String(manager.user.id)
    fileNumber=String(manager.row.file_number)
  }else{
    const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim()||null
    const id=await resolveClientToken(token,sql)
    if(!id)return {error:NextResponse.json({error:'Client authentication required'},{status:401,headers:privateHeaders})}
    const [user]=await sql`
      SELECT id,file_number FROM users
      WHERE id=${id}::uuid AND role='client' AND COALESCE(is_active,true)=true LIMIT 1
    `
    if(!user?.file_number)return {error:NextResponse.json({error:'Active Client File Folder required'},{status:403,headers:privateHeaders})}
    clientId=String(user.id)
    fileNumber=String(user.file_number)
  }
  await ensureClientBusinessStoreSchema(sql)
  await ensureFileFolderWorldSchema(sql)
  await ensureEnterpriseDreamSchema(sql)
  await ensureLegionCommerceSchema(sql)
  await ensureCustomerDoorSettlementSchema()
  const [store]=await sql`
    SELECT id FROM client_business_stores
    WHERE client_id=${clientId}::uuid AND file_number=${fileNumber}
    LIMIT 1
  `
  if(!store)return {error:NextResponse.json({error:'This File Folder has no business store yet'},{status:404,headers:privateHeaders})}
  return {clientId,fileNumber,storeId:String(store.id)}
}

export async function GET(request:NextRequest){
  try{
    const ctx=await owner(request)
    if(ctx.error)return ctx.error
    const result=await getOwnerEarnings(ctx.clientId!,ctx.fileNumber!,ctx.storeId!)
    return NextResponse.json(result,{headers:privateHeaders})
  }catch(error){
    console.error('[File Folder owner earnings GET]',error)
    return NextResponse.json({error:'Earnings report unavailable'},{status:500,headers:privateHeaders})
  }
}

export async function POST(request:NextRequest){
  try{
    const ctx=await owner(request)
    if(ctx.error)return ctx.error
    const body=await request.json().catch(()=>({}))
    if(!validOwnerCost({
      category:body.category,currency:body.currency,
      amount:body.amount,description:body.description,requestId:body.requestId
    })){
      return NextResponse.json({error:'Category, allowed currency, positive amount, description and request ID required'},{status:400,headers:privateHeaders})
    }
    const orderId=String(body.orderId||'').trim()
    const systemId=String(body.systemId||'').trim()
    if((orderId&&!uuid(orderId))||(systemId&&!uuid(systemId))){
      return NextResponse.json({error:'Use a valid related order or system identifier'},{status:400,headers:privateHeaders})
    }
    const result=await recordOwnerCost({
      clientId:ctx.clientId!,fileNumber:ctx.fileNumber!,storeId:ctx.storeId!,
      category:body.category,amount:body.amount,currency:body.currency,
      description:body.description,requestId:body.requestId,
      evidenceReference:String(body.evidenceReference||'').slice(0,160),
      orderId:orderId||undefined,systemId:systemId||undefined,
    })
    if(!result.ok)return NextResponse.json({error:result.error},{status:403,headers:privateHeaders})
    return NextResponse.json({success:true,cost:result.cost,
      message:'Operating cost recorded. This record does not transfer funds or verify that an external expense was paid.'},
      {headers:privateHeaders})
  }catch(error){
    console.error('[File Folder owner earnings POST]',error)
    return NextResponse.json({error:'Unable to record owner-reported cost'},{status:500,headers:privateHeaders})
  }
}
