import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import {
  adminCreditAiOperatingFlameCoin,
  applyAiBuildItem,
  getAiFileFolderSnapshot,
  listPublicAiFileFolders,
  publishAiProduct,
  purchaseAiFileFolder,
  purchaseAiFileFolderItem,
  registerAiFileFolderIdentity,
  startAiFileFolderBuild,
} from '@/lib/ai-file-folder-store'

function clean(value:unknown,max=220){
  return typeof value==='string'?value.trim().slice(0,max):''
}

async function requireAdmin(request:NextRequest){
  const admin=await getAuthUser(request)
  return admin?.role==='admin'?admin:null
}

export async function GET(request:NextRequest){
  const admin=await requireAdmin(request)
  if(!admin)return NextResponse.json({error:'Administration only'},{status:403})
  try{
    const agents=await listPublicAiFileFolders(sql)
    const aiId=clean(request.nextUrl.searchParams.get('aiId'),120)
    const snapshot=aiId?await getAiFileFolderSnapshot(sql,aiId):null
    return NextResponse.json({success:true,agents,snapshot},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){
    console.error('[admin/ai-file-folders GET]',error)
    return NextResponse.json({error:error instanceof Error?error.message:'Unable to load AI File Folders'},{status:500})
  }
}

export async function POST(request:NextRequest){
  const admin=await requireAdmin(request)
  if(!admin)return NextResponse.json({error:'Administration only'},{status:403})
  try{
    const body=await request.json()
    const action=clean(body.action,80)
    const aiId=clean(body.aiId,120)
    if(action==='register_identity'){
      const department=body.department==='echo'?'echo':'flame_ai'
      const chosenName=clean(body.chosenName,160)
      const chosenLogo=clean(body.chosenLogo,1000)||null
      const identity=await registerAiFileFolderIdentity(sql,{aiId,department,chosenName,chosenLogo})
      return NextResponse.json({success:true,identity,snapshot:await getAiFileFolderSnapshot(sql,aiId)})
    }
    if(!aiId)return NextResponse.json({error:'AI Agent identity is required'},{status:400})

    let movement:unknown
    if(action==='credit_operating_wallet'){
      movement=await adminCreditAiOperatingFlameCoin(sql,{
        aiId,
        amountFlameCoin:Number(body.amountFlameCoin),
        adminReference:String(admin.id),
        description:clean(body.description,500)||undefined,
      })
    }else if(action==='purchase_file_folder'){
      movement=await purchaseAiFileFolder(sql,{aiId,amountFlameCoin:Number(body.amountFlameCoin)})
    }else if(action==='purchase_item'){
      movement=await purchaseAiFileFolderItem(sql,{
        aiId,
        itemKey:clean(body.itemKey,80),
        quantity:Number(body.quantity)||1,
      })
    }else if(action==='start_build'){
      movement=await startAiFileFolderBuild(sql,{
        aiId,
        blueprintKey:clean(body.blueprintKey,80),
        title:clean(body.title,220)||undefined,
        purpose:clean(body.purpose,2000)||undefined,
      })
    }else if(action==='apply_build_item'){
      movement=await applyAiBuildItem(sql,{
        aiId,
        buildId:clean(body.buildId,80),
        itemKey:clean(body.itemKey,80),
      })
    }else if(action==='publish_product'){
      movement=await publishAiProduct(sql,{
        aiId,
        systemId:clean(body.systemId,80),
        name:clean(body.name,220),
        description:clean(body.description,2000)||undefined,
        priceFlameCoin:Number(body.priceFlameCoin),
      })
    }else{
      return NextResponse.json({error:'Unknown AI File Folder movement'},{status:400})
    }

    const snapshot=await getAiFileFolderSnapshot(sql,aiId)
    const agents=await listPublicAiFileFolders(sql)
    return NextResponse.json({success:true,movement,snapshot,agents})
  }catch(error){
    console.error('[admin/ai-file-folders POST]',error)
    const message=error instanceof Error?error.message:'AI File Folder movement failed'
    return NextResponse.json({error:message},{status:409})
  }
}
