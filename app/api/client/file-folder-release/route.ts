import {NextRequest,NextResponse} from 'next/server'
import {resolveClientToken} from '@/lib/client-vault'
import {getFileFolderDb} from '@/lib/client-file-folder'
import {getPublishedFileFolderRelease} from '@/lib/file-folder-world-release'

export const dynamic='force-dynamic'
export async function GET(request:NextRequest){
 try{
  const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'').trim()||null
  const clientId=await resolveClientToken(token,getFileFolderDb())
  if(!clientId)return NextResponse.json({error:'Client login required'},{status:401})
  const release=await getPublishedFileFolderRelease()
  return NextResponse.json({success:true,version:Number(release.version),config:release.config},
    {headers:{'Cache-Control':'private, no-store'}})
 }catch(error){console.error('[client file-folder release]',error)
  return NextResponse.json({error:'Unable to read current File Folder world update'},{status:500})}
}
