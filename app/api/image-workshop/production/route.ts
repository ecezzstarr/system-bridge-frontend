import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {IMAGE_WORKSHOP_ROLES} from '@/lib/weave-image-workshop'
import {creativeAvailability,creativeHistory,runCreativeProduction} from '@/lib/weave-creative-production'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export const maxDuration=150
const reply=(body:object,status=200)=>NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}})
export async function GET(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user||!IMAGE_WORKSHOP_ROLES.has(user.role))return reply({error:'Active workshop account required.'},403)
 try{return reply({success:true,...creativeAvailability(user.role),jobs:await creativeHistory(user.id)})}catch{return reply({error:'Production records unavailable.'},503)}
}
export async function POST(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user||!IMAGE_WORKSHOP_ROLES.has(user.role))return reply({error:'Active workshop account required.'},403)
 try{return await runCreativeProduction(user,await request.json())}catch{return reply({error:'Production unavailable. Check the workshop record before retrying.'},503)}
}
