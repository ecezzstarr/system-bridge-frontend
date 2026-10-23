import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {draftFileFolderWorldRelease,draftRollbackFileFolderWorldRelease,
  getPublishedFileFolderRelease,listFileFolderReleases,publishFileFolderWorldRelease} from '@/lib/file-folder-world-release'
export const dynamic='force-dynamic'
const headers={'Cache-Control':'private, no-store'}
async function authorize(request:NextRequest){
 const user=await getAuthUser(request)
 return user?.role==='admin'?user:null
}
export async function GET(request:NextRequest){
 const user=await authorize(request)
 if(!user)return NextResponse.json({error:'Administration only'},{status:403})
 try{
  const [published,releases]=await Promise.all([getPublishedFileFolderRelease(),listFileFolderReleases()])
  return NextResponse.json({success:true,published,releases,
    note:'These are safe, versioned runtime File Folder world settings for all four tiers. Source-code changes still require the independent WEAVE Release Workshop.'},{headers})
 }catch(error){console.error('[file-folder release GET]',error);return NextResponse.json({error:'File Folder release register unavailable'},{status:500})}
}
export async function POST(request:NextRequest){
 const user=await authorize(request)
 if(!user)return NextResponse.json({error:'Administration only'},{status:403})
 try{
  const body=await request.json().catch(()=>({}))
  const action=String(body.action||'')
  if(action==='draft'){
   const release=await draftFileFolderWorldRelease(body.config,user.id)
   return NextResponse.json({success:true,release},{status:201,headers})
  }
  if(action==='prepare_rollback'){
   const release=await draftRollbackFileFolderWorldRelease(Number(body.version),user.id)
   return NextResponse.json({success:true,release},{status:201,headers})
  }
  if(action==='publish'){
   if(body.confirmation!=='PUBLISH FILE FOLDERS')
     return NextResponse.json({error:'Type PUBLISH FILE FOLDERS to confirm all-client rollout'},{status:400})
   const published=await publishFileFolderWorldRelease(String(body.releaseId||''),user.id,Number(body.expectedVersion))
   return NextResponse.json({success:true,published},{headers})
  }
  return NextResponse.json({error:'Unknown File Folder release action'},{status:400})
 }catch(error:any){console.error('[file-folder release POST]',error);return NextResponse.json({error:error?.message||'Unable to publish File Folder release'},{status:409})}
}
