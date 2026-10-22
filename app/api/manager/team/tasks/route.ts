import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {createDistributionTeamTask,moveDistributionTeamTask,reassignDistributionTeamTask,readDistributionTeamTasks,
  type TeamTaskStatus} from '@/lib/distribution-team-tasks'
export const dynamic='force-dynamic'
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
async function staff(request:NextRequest){
  const u=await getAuthUser(request)
  return u&&['agent','bridger'].includes(u.role)?u:null
}
export async function GET(request:NextRequest){
  const user=await staff(request)
  if(!user)return NextResponse.json({success:false,error:'Approved Distribution employment required'},{status:403})
  try{
    const workspace=await readDistributionTeamTasks(user.id)
    if(!workspace)return NextResponse.json({success:false,error:'No approved Distribution team appointment'},{status:403})
    return NextResponse.json({success:true,workspace},{headers:{'Cache-Control':'private, no-store'}})
  }catch(e){console.error('[team tasks] load failed',e)
    return NextResponse.json({success:false,error:'Unable to load Distribution tasks'},{status:500})}
}
export async function POST(request:NextRequest){
  const user=await staff(request)
  if(!user)return NextResponse.json({success:false,error:'Approved Distribution employment required'},{status:403})
  const body=await request.json().catch(()=>({}))
  try{
    let result
    if(body.action==='assign'){
      if(!UUID.test(String(body.assigneeId||''))||typeof body.title!=='string'||typeof body.instructions!=='string')
        return NextResponse.json({success:false,error:'Select a team member and enter actual assignment details'},{status:400})
      result=await createDistributionTeamTask(user.id,body.assigneeId,body.title,body.instructions)
    }else if(body.action==='reassign'){
      if(!UUID.test(String(body.taskId||''))||!UUID.test(String(body.assigneeId||''))
        ||typeof body.note!=='string')
        return NextResponse.json({success:false,error:'Choose an active team member and explain the reassignment'},{status:400})
      result=await reassignDistributionTeamTask(user.id,body.taskId,body.assigneeId,body.note)
    }else if(body.action==='update'){
      if(!UUID.test(String(body.taskId||''))||typeof body.note!=='string'
        ||!['in_progress','submitted','completed'].includes(body.status))
        return NextResponse.json({success:false,error:'Choose an allowed task movement and provide a handoff report'},{status:400})
      result=await moveDistributionTeamTask(user.id,body.taskId,body.status as TeamTaskStatus,body.note)
    }else return NextResponse.json({success:false,error:'Unknown task action'},{status:400})
    if(!result.success)return NextResponse.json({success:false,error:
      result.reason==='not_manager'?'Only the verified lead Distribution Manager can assign work.':
      result.reason==='invalid_assignee'?'Choose yourself or an appointed assistant in your own team.':
      result.reason==='invalid_transition'?'This task cannot be moved into that state by this role. Refresh progress.':
      result.reason==='not_employee'?'Your appointment no longer grants team work access.':
      result.reason==='invalid_task'?'Title must be 6–140 characters and instructions 15–2000 characters.':
      result.reason==='invalid_update'?'Add an 8–1200 character evidence or handoff note.':
      'Task action unavailable'},{status:result.reason==='error'?500:403})
    return NextResponse.json({success:true,result},{headers:{'Cache-Control':'private, no-store'}})
  }catch(e){console.error('[team tasks] action failed',e)
    return NextResponse.json({success:false,error:'Unable to record team task'},{status:500})}
}
