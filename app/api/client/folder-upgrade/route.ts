import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {sql} from '@/lib/db'
import {getClientFolderUpgrade,clientUpgradePublicView} from '@/lib/client-folder-upgrade'
export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user||user.role!=='client')return NextResponse.json({error:'Client login required'},{status:401})
  try{
    const [client]=await sql`SELECT id,file_number FROM users
      WHERE id=${user.id}::uuid AND role='client' AND COALESCE(is_active,true)=true LIMIT 1`
    if(!client?.file_number)return NextResponse.json({success:true,upgrade:null},{headers:{'Cache-Control':'private, no-store'}})
    const upgrade=await getClientFolderUpgrade(sql,String(client.id),String(client.file_number))
    return NextResponse.json({success:true,upgrade:clientUpgradePublicView(upgrade)},
      {headers:{'Cache-Control':'private, no-store'}})
  }catch(error){console.error('[client upgrade status]',error);return NextResponse.json({error:'Unable to read File Folder upgrade'},{status:500})}
}
