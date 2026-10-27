import {NextRequest,NextResponse} from 'next/server'
import {deriveFormationDesign} from '@/lib/file-folder-formation-engine'
import {getFileFolderDb,ensureClientFileFolderSchema} from '@/lib/client-file-folder'
import {resolveClientToken} from '@/lib/client-vault'
import {createPartProposal,FORMATION_MATERIALS} from '@/lib/file-folder-generative-formation'
import type {FormationMaterial} from '@/lib/file-folder-generative-formation'
import {createSourceEnginePlan} from '@/lib/file-folder-source-engine'

async function context(request:NextRequest){
 const sql=getFileFolderDb()
 const token=request.headers.get('authorization')?.replace(/^Bearer\\s+/i,'').trim()||null
 const clientId=await resolveClientToken(token,sql)
 if(!clientId)return {error:NextResponse.json({error:'Client login required'},{status:401})}
 await ensureClientFileFolderSchema(sql)
 const [folder]=await sql`SELECT f.file_number FROM client_file_folders f JOIN users u ON u.id=f.client_id WHERE f.client_id=${clientId}::uuid AND f.status='active' AND u.role='client' AND COALESCE(u.is_active,true)=true LIMIT 1`
 if(!folder)return {error:NextResponse.json({error:'Active Client File Folder required'},{status:403})}
 await sql`CREATE TABLE IF NOT EXISTS client_generated_formations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_id uuid NOT NULL REFERENCES users(id),
 file_number varchar(120) NOT NULL,
 specification jsonb NOT NULL,
 status varchar(24) NOT NULL DEFAULT 'conceptual',
 created_at timestamptz NOT NULL DEFAULT NOW(),
 updated_at timestamptz NOT NULL DEFAULT NOW()
 )`
 return {sql,clientId,fileNumber:String(folder.file_number)}
}
export async function GET(request:NextRequest){
 try{
  const ctx=await context(request);if(ctx.error)return ctx.error
  const rows=await ctx.sql!`SELECT id,specification,status,created_at FROM client_generated_formations WHERE client_id=${ctx.clientId}::uuid AND file_number=${ctx.fileNumber} ORDER BY created_at DESC LIMIT 100`
  return NextResponse.json({success:true,formations:rows},{headers:{'Cache-Control':'private, no-store'}})
 }catch(e){console.error('[generated-formations GET]',e);return NextResponse.json({error:'Unable to load formations'},{status:500})}
}
export async function POST(request:NextRequest){
 try{
  const ctx=await context(request);if(ctx.error)return ctx.error
  const body=await request.json()
  if(body.action!=='propose')return NextResponse.json({error:'Unsupported movement'},{status:400})
  const description=typeof body.description==='string'?body.description:''
  const name=typeof body.name==='string'?body.name.slice(0,100):undefined
  const materials=Array.isArray(body.materials)?body.materials.filter((m:unknown):m is FormationMaterial=>typeof m==='string'&&FORMATION_MATERIALS.includes(m as FormationMaterial)).slice(0,10):[]
  const proposal=createPartProposal({clientId:String(ctx.clientId),fileNumber:ctx.fileNumber!,description,name,materials})
  const sourcePlan=createSourceEnginePlan({name:proposal.name,sourceDescription:proposal.prompt,systemKind:body.systemKind})
  const specification={...proposal,sourcePlan,design:deriveFormationDesign(proposal)}
  const rows=await ctx.sql!`INSERT INTO client_generated_formations(client_id,file_number,specification) VALUES(${ctx.clientId}::uuid,${ctx.fileNumber},${JSON.stringify(specification)}::jsonb) RETURNING id,specification,status,created_at`
  return NextResponse.json({success:true,formation:rows[0]},{status:201})
 }catch(e){
  if(e instanceof Error&&(e.message.includes('meaningful description')||e.message.includes('meaningful source description')))return NextResponse.json({error:e.message},{status:400})
  console.error('[generated-formations POST]',e);return NextResponse.json({error:'Unable to form proposal'},{status:500})
 }
}
