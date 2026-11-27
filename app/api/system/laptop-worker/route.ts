import {NextRequest,NextResponse} from 'next/server'
import {LaptopError,pairLaptop,laptopExchange,readLaptopJson} from '@/lib/weave-laptop-worker'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
export async function POST(request:NextRequest){
 try{
  const body=await readLaptopJson(request)
  if(body.action==='pair')return NextResponse.json({success:true,...await pairLaptop(body.code)},{status:201,headers})
  const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||''
  return NextResponse.json({success:true,...await laptopExchange(token,body)},{headers})
 }catch(error){
  if(error instanceof LaptopError)return NextResponse.json({error:error.message},{status:error.status,headers})
  console.error('[laptop worker] exchange unavailable')
  return NextResponse.json({error:'Laptop connection unavailable'},{status:503,headers})
 }
}
