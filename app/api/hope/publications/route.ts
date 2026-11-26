import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {sql} from '@/lib/db'
import {departments,starterPublications,type Publication} from '@/lib/hope-publication-library'
export const dynamic='force-dynamic'
async function ensure(){await sql`CREATE TABLE IF NOT EXISTS weave_publication_library (id text PRIMARY KEY, publication jsonb NOT NULL, updated_by uuid, updated_at timestamptz NOT NULL DEFAULT NOW())`}
export async function GET(request:NextRequest){
 const user=await getAuthUser(request)
 if(!user||!['admin','bridger'].includes(user.role))return NextResponse.json({success:false,error:'Hope or Administrations access required'},{status:403})
 try{await ensure();const rows=await sql`SELECT publication FROM weave_publication_library`;const items=new Map(starterPublications.map(p=>[p.id,p]));for(const row of rows){const p=row.publication as Publication;items.set(p.id,p)}
 return NextResponse.json({success:true,items:[...items.values()].filter(p=>user.role==='admin'||p.active)},{headers:{'Cache-Control':'no-store'}})
 }catch(e){console.error('[Publication Library]',e);return NextResponse.json({success:false,error:'Library unavailable'},{status:500})}
}
export async function POST(request:NextRequest){
 const user=await getAuthUser(request)
 if(user?.role!=='admin')return NextResponse.json({success:false,error:'Administrations access required'},{status:403})
 try{
 const p=await request.json() as Publication
 const allowedImage=starterPublications.some(x=>x.image===p.image)|| (typeof p.image==='string'&&/^\/api\/media\/ads\/[\w/-]+\.(jpg|png|webp|gif)$/.test(p.image))
 if(typeof p.id!=='string'||!(/^(seed-[0-3]-[0-9]-[0-5]|custom-[0-9a-f-]{36})$/.test(p.id))||!departments.includes(p.department)||typeof p.title!=='string'||!p.title.trim()||p.title.length>90||typeof p.caption!=='string'||!p.caption.trim()||p.caption.length>2000||!allowedImage||!Number.isInteger(p.style)||p.style<0||p.style>5||typeof p.active!=='boolean')return NextResponse.json({success:false,error:'Invalid publication details or image path'},{status:400})
 const item:Publication={id:p.id,department:p.department,title:p.title.trim(),caption:p.caption.trim(),image:p.image,style:p.style,active:p.active}
 await ensure();await sql`INSERT INTO weave_publication_library (id,publication,updated_by) VALUES (${item.id},${JSON.stringify(item)}::jsonb,${user.id}::uuid) ON CONFLICT(id) DO UPDATE SET publication=EXCLUDED.publication,updated_by=EXCLUDED.updated_by,updated_at=NOW()`
 return NextResponse.json({success:true,item})
 }catch(e){console.error('[Publication Library]',e);return NextResponse.json({success:false,error:'Unable to save publication'},{status:500})}
}
