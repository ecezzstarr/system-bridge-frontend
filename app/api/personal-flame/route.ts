import {flameWebQuery,flameWebSearchReply} from '@/lib/flame-web-search'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { chatWithRiver } from '@/lib/river-assistant'
import { withFlameUsage } from '@/lib/flame-usage'
import { flameOperationIntent, flameFollowupDirection } from '@/lib/flame-environment'
import { runFlameEnvironment } from '@/lib/flame-environment-runtime'
import type { FlameMovement } from '@/lib/flame-environment'
import { PERSONAL_FLAME_DAILY_MODEL_LIMIT, PERSONAL_FLAME_MAX_MESSAGE, personalFlameNativeReply, nativeFlameClarification, personalFlameModelContext, type PersonalFlameMessage } from '@/lib/personal-flame'

export const dynamic = 'force-dynamic'
const headers = {'Cache-Control':'private, no-store'}
const reply = (body:object,status=200) => NextResponse.json(body,{status,headers})
async function ensureSchema(){
  await sql`CREATE TABLE IF NOT EXISTS weave_personal_flame_turns (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
    instruction text NOT NULL, response text NOT NULL,
    mode text NOT NULL CHECK(mode IN ('native','model')), created_at timestamptz NOT NULL DEFAULT NOW()
  )`
  await sql`ALTER TABLE weave_personal_flame_turns ADD COLUMN IF NOT EXISTS movement jsonb`
  await sql`CREATE INDEX IF NOT EXISTS weave_personal_flame_turns_user_time ON weave_personal_flame_turns(user_id,created_at DESC)`
  await sql`CREATE TABLE IF NOT EXISTS weave_personal_flame_usage (
    user_id uuid NOT NULL, usage_day date NOT NULL, requests integer NOT NULL DEFAULT 0,
    PRIMARY KEY(user_id,usage_day)
  )`
}
async function history(userId:string):Promise<PersonalFlameMessage[]>{
  const rows=await sql`SELECT instruction,response,mode,movement FROM weave_personal_flame_turns
    WHERE user_id=${userId}::uuid ORDER BY created_at DESC,id DESC LIMIT 30`
  return rows.reverse().flatMap(row=>[
    {role:'user' as const,content:String(row.instruction),mode:row.mode as PersonalFlameMessage['mode']},
    {role:'assistant' as const,content:String(row.response),mode:row.mode as PersonalFlameMessage['mode'],...(row.movement?{movement:row.movement as FlameMovement}:{})},
  ])
}
export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return reply({error:'Active WEAVE login required.'},401)
  try{
    await ensureSchema()
    return reply({identity:{name:'Personal Flame',owner:'WEAVE',scope:'personal'},messages:await history(user.id)})
  }catch{return reply({error:'Personal Flame records are temporarily unavailable.'},503)}
}
export async function POST(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return reply({error:'Active WEAVE login required.'},401)
  try{
    const body=await request.json().catch(()=>null)
    const message=typeof body?.message==='string'?body.message.trim():''
    if(!message||message.length>PERSONAL_FLAME_MAX_MESSAGE)return reply({error:'Enter a message of up to 4,000 characters.'},400)
    await ensureSchema()
    const previous=await history(user.id)
    const priorMovement=previous[previous.length-1]?.movement
    const operationMessage=flameFollowupDirection(user.role,message,priorMovement)??message
    if(body?.previewOnly===true)return reply({movement:await runFlameEnvironment(request,user.role,operationMessage,true)})
    const webQuery=flameWebQuery(message)
    const intent=flameOperationIntent(operationMessage)
    const native=personalFlameNativeReply(message,previous,user.role)
    const operation=async()=>{
    const movement=webQuery!==null?null:await runFlameEnvironment(request,user.role,operationMessage)
    let response=(webQuery!==null?await flameWebSearchReply(user.id,webQuery):null)??movement?.summary??native??(body?.allowExternal!==true?nativeFlameClarification(message,user.role):null)
    let mode:'native'|'model'='native'
    if(response===null){
      if(body?.allowExternal!==true)return reply({error:'This question requires advanced conversation. Enable external model assistance to continue, or use a native command.',code:'CONSENT_REQUIRED'},409)
      if(!process.env.OPENAI_API_KEY&&!process.env.GOOGLE_AI_KEY&&!process.env.GEMINI_API_KEY)
        return reply({error:'Advanced conversation is not configured. Native commands remain available.'},503)
      const reserved=user.role==='admin'?[{requests:0}]:await sql`INSERT INTO weave_personal_flame_usage(user_id,usage_day,requests)
        VALUES(${user.id}::uuid,(NOW() AT TIME ZONE 'UTC')::date,1)
        ON CONFLICT(user_id,usage_day) DO UPDATE SET requests=weave_personal_flame_usage.requests+1
        WHERE weave_personal_flame_usage.requests<${PERSONAL_FLAME_DAILY_MODEL_LIMIT}
        RETURNING requests`
      if(!reserved.length)return reply({error:'Daily advanced conversation allowance reached. Native commands remain available.'},429)
      response=await chatWithRiver(personalFlameModelContext(previous,message),{personalFlame:true})
      if(!response||response.includes('AI connection is not configured on this server yet.')||response==='I am having trouble connecting. Please try again.')
        return reply({error:'Advanced conversation is temporarily unavailable. No reply was recorded.'},503)
      mode='model'
    }
    await sql`INSERT INTO weave_personal_flame_turns(user_id,instruction,response,mode,movement)
      VALUES(${user.id}::uuid,${message},${response},${mode},${movement?JSON.stringify(movement):null}::jsonb)`
    return reply({messages:await history(user.id),mode,movement})
    }
    if(webQuery!==null)return await withFlameUsage(user.id,user.role,'workshop_operation',async()=>{try{return await operation()}catch(error){return reply({error:error instanceof Error?error.message:'Web search unavailable.'},503)}})
    if(intent?.kind==='navigate')return await operation()
    return await withFlameUsage(user.id,user.role,intent?'workshop_operation':(native!==null||body?.allowExternal!==true)?'native_reply':'model_reply',operation,b=>b.movement?.state!=='blocked')
  }catch{return reply({error:'Personal Flame could not complete this interaction.'},503)}
}
export async function DELETE(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return reply({error:'Active WEAVE login required.'},401)
  try{
    await ensureSchema()
    await sql`DELETE FROM weave_personal_flame_turns WHERE user_id=${user.id}::uuid`
    return reply({messages:[]})
  }catch{return reply({error:'Unable to clear your personal conversation.'},503)}
}
