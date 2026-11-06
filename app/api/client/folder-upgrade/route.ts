import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {sql} from '@/lib/db'
import {getProActivationState} from '@/lib/pro-file-folder-activation'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='client')return NextResponse.json({error:'Client login required'},{status:401})
  try{
    const [client]=await sql`SELECT id,file_number FROM users
      WHERE id=${user.id}::uuid AND role='client' AND COALESCE(is_active,true)=true LIMIT 1`
    if(!client?.file_number)return NextResponse.json({success:true,upgrade:null},{headers:{'Cache-Control':'private, no-store'}})
    const activation=await getProActivationState(String(client.id),String(client.file_number))
    return NextResponse.json({success:true,upgrade:activation?{
      fileNumber:client.file_number,tier:'pro',status:activation.status,
      notice:activation.status==='active'?'Your Pro File Folder is active.':
        'Complete your one-time 680 USDT Pro File Folder activation. Business plan, signed agreement and Forensics verification are required.'
    }:null},{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[client upgrade status]',error);return NextResponse.json({error:'Unable to read File Folder upgrade'},{status:500})}
}
