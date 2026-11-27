import {NextRequest,NextResponse} from 'next/server'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {join} from 'node:path'
import {requireWorkshopAuthorization} from '@/lib/workshop-auth'
import {LaptopError,laptopState,createLaptopPairing,queueLaptopJob,revokeLaptop,readLaptopJson} from '@/lib/weave-laptop-worker'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
function failure(error:unknown){
 if(error instanceof LaptopError)return NextResponse.json({error:error.message},{status:error.status,headers})
 console.error('[laptop workshop] operation unavailable')
 return NextResponse.json({error:'Laptop workshop unavailable'},{status:503,headers})
}
export async function GET(request:NextRequest){
 const auth=await requireWorkshopAuthorization(request)
 if(!auth.authorized)return auth.response
 try{
  const state=await laptopState()
  const source=await readFile(join(process.cwd(),'public/host/weave-laptop-worker.ps1')).catch(()=>null)
  return NextResponse.json({success:true,...state,installerSha256:source?createHash('sha256').update(source).digest('hex'):null},{headers})
 }catch(error){return failure(error)}
}
export async function POST(request:NextRequest){
 const auth=await requireWorkshopAuthorization(request)
 if(!auth.authorized)return auth.response
 try{
  const body=await readLaptopJson(request)
  const actor=auth.session.user.id
  if(body.action==='pairing')return NextResponse.json({success:true,...await createLaptopPairing(actor,body.label,body.confirmation)},{status:201,headers})
  if(body.action==='queue')return NextResponse.json({success:true,...await queueLaptopJob(actor,body.deviceId,body.operation,body.confirmation)},{status:201,headers})
  if(body.action==='revoke')return NextResponse.json({success:true,...await revokeLaptop(actor,body.deviceId,body.confirmation)},{headers})
  throw new LaptopError('Choose a supported laptop action',400)
 }catch(error){return failure(error)}
}
