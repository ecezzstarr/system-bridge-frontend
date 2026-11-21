import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {getFileFolderDb,ensureClientFileFolderSchema} from '@/lib/client-file-folder'
import {resolveClientToken} from '@/lib/client-vault'
import {trustedMutationOrigin} from '@/lib/request-origin'
import {ensureLegionEmploymentSchema} from '@/lib/legion-employment'
import {ensureFileFolderWorldSchema} from '@/lib/client-file-folder-world'
import {ensureCustomerDoorSettlementSchema} from '@/lib/customer-door-settlement'
import {ensureFileFolderPresenceSchema,getOwnerPresenceSnapshot,recognizeOwnerPresence} from '@/lib/file-folder-presence-continuity'

export const dynamic='force-dynamic'
const privateHeaders={'Cache-Control':'private, no-store'}
let dependenciesReady:Promise<void>|null=null
function ensurePresenceDependencies(){
  if(!dependenciesReady)dependenciesReady=(async()=>{
    const sql=getFileFolderDb()
    await ensureFileFolderWorldSchema(sql)
    await ensureLegionEmploymentSchema(sql)
    await ensureCustomerDoorSettlementSchema()
    await ensureFileFolderPresenceSchema()
  })().catch(error=>{dependenciesReady=null;throw error})
  return dependenciesReady
}

async function ownerContext(request:NextRequest){
  const sql=getFileFolderDb()
  const bearer=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim()||null
  const tokenId=bearer?await resolveClientToken(bearer,sql):null
  const auth=tokenId?null:await getAuthUser(request)
  const clientId=tokenId||(auth?.role==='client'?auth.id:null)
  if(!clientId)return {clientId:null,fileNumber:null,error:NextResponse.json({error:'Client login required'},{status:401})}
  await ensureClientFileFolderSchema(sql)
  const [owner]=await sql`
    SELECT f.file_number FROM client_file_folders f
    JOIN users u ON u.id=f.client_id AND u.file_number=f.file_number
    WHERE f.client_id=${clientId}::uuid AND f.status='active'
      AND u.role='client' AND u.is_active=true LIMIT 1
  `
  if(!owner)return {clientId:null,fileNumber:null,error:NextResponse.json({error:'Active owned File Folder required'},{status:403})}
  return {clientId,fileNumber:String(owner.file_number),error:null}
}

export async function GET(request:NextRequest){
  try{
    const ctx=await ownerContext(request)
    if(ctx.error)return ctx.error
    await ensurePresenceDependencies()
    const snapshot=await getOwnerPresenceSnapshot(ctx.clientId!,ctx.fileNumber!)
    return NextResponse.json({success:true,snapshot},{headers:privateHeaders})
  }catch(error){
    console.error('[File Folder presence GET]',error)
    return NextResponse.json({error:'Presence movement records unavailable'},{status:503,headers:privateHeaders})
  }
}

export async function POST(request:NextRequest){
  if(!trustedMutationOrigin(request))
    return NextResponse.json({error:'Cross-origin recognition is not allowed'},{status:403,headers:privateHeaders})
  try{
    const ctx=await ownerContext(request)
    if(ctx.error)return ctx.error
    const body=await request.json().catch(()=>({}))
    if(body?.action!=='recognize'||typeof body?.through!=='string')
      return NextResponse.json({error:'A reviewed File Folder snapshot is required'},{status:422,headers:privateHeaders})
    const reviewedAt=await recognizeOwnerPresence(ctx.clientId!,ctx.fileNumber!,body.through)
    return NextResponse.json({success:true,reviewedAt},{headers:privateHeaders})
  }catch(error){
    if(error instanceof Error&&/snapshot time|Refresh your File Folder/.test(error.message))
      return NextResponse.json({error:error.message},{status:422,headers:privateHeaders})
    console.error('[File Folder presence recognition]',error)
    return NextResponse.json({error:'Unable to record this recognition'},{status:503,headers:privateHeaders})
  }
}
