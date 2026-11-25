import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { getPool } from '@/lib/db'
import { randomUUID } from 'crypto'

const allowedRoles = new Set(['admin','agent','bridger','client'])
const maxImage = 3 * 1024 * 1024
const text = (value: unknown) => typeof value === 'string' ? value.trim() : ''

export async function POST(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (authUser.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const multipart = request.headers.get('content-type')?.includes('multipart/form-data')
    if (Number(request.headers.get('content-length') || 0) > maxImage + 64 * 1024)
      return NextResponse.json({error:'Announcement is too large'}, {status:413})
    const form = multipart ? await request.formData() : null
    const body = form ? {
      title:form.get('title'), content:form.get('content'), directions:form.get('directions'),
      earnings:form.get('earnings'), link:form.get('link'),
      roles:form.getAll('roles'), image:form.get('image')
    } : await request.json()
    const title=text(body.title), message=text(body.content)
    const directions=text(body.directions), earnings=text(body.earnings), link=text(body.link)
    if (!title || !message || title.length>150 || message.length>8000 || directions.length>4000 || earnings.length>4000)
      return NextResponse.json({error:'Title and write-up are required. Please keep each field within its displayed limit.'},{status:400})
    if (link && (link.length>500 || !/^\/[a-zA-Z0-9/_-]+(?:[?#][^\\\r\n]*)?$/.test(link) || link.startsWith('//') || /[\\\u0000-\u0020]/.test(link)))
      return NextResponse.json({error:'Use a company work-page path such as /distribution-studio'},{status:400})
    const roles = body.roles == null ? [] : body.roles
    if (!Array.isArray(roles) || roles.some((role:unknown)=>typeof role!=='string'||!allowedRoles.has(role)))
      return NextResponse.json({error:'Invalid department selection'},{status:400})
    let image:Buffer|null=null
    let mime=''
    if (form && body.image instanceof File && body.image.size>0) {
      mime=body.image.type
      if (!['image/jpeg','image/png','image/webp'].includes(mime)||body.image.size>maxImage)
        return NextResponse.json({error:'Choose a JPG, PNG or WebP image of 3 MB or less'},{status:400})
      image=Buffer.from(await body.image.arrayBuffer())
      const valid=mime==='image/png'?image.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):
        mime==='image/jpeg'?image[0]===255&&image[1]===216&&image[2]===255:
        image.toString('ascii',0,4)==='RIFF'&&image.toString('ascii',8,12)==='WEBP'
      if(!valid)return NextResponse.json({error:'Invalid image file'},{status:400})
    }
    const content=[message,directions?'Directions of work:\n'+directions:'',earnings?'Earning conditions:\n'+earnings:''].filter(Boolean).join('\n\n')
    const type=image?'company_announcement_image':'company_announcement'
    const sender=(authUser.name || 'Administrator')+' · A Time'
    const client=await getPool().connect()
    try {
      await client.query('BEGIN')
      // Existing notification rows and their push trigger remain the delivery path.
      let count=0
      if(image){
        await client.query("SELECT pg_advisory_xact_lock(hashtext('weave_company_announcement_media_v1'))")
        await client.query(`CREATE TABLE IF NOT EXISTS weave_company_announcement_images (
          id uuid PRIMARY KEY, mime text NOT NULL, bytes bytea NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS weave_company_announcement_image_recipients (
          notification_id uuid PRIMARY KEY REFERENCES notifications(id) ON DELETE CASCADE,
          image_id uuid NOT NULL REFERENCES weave_company_announcement_images(id)
        );`)
        const id=randomUUID()
        await client.query('INSERT INTO weave_company_announcement_images(id,mime,bytes) VALUES($1,$2,$3)',[id,mime,image])
        const result=await client.query(`WITH delivered AS (
          INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)
          SELECT id,$1,$2,$3,$4::uuid,$5,$6 FROM users
          WHERE is_active=true AND (cardinality($7::text[])=0 OR role::text=ANY($7::text[]))
          RETURNING id
        ) INSERT INTO weave_company_announcement_image_recipients(notification_id,image_id)
          SELECT id,$8::uuid FROM delivered`,[type,title,content,authUser.id,sender,link||null,roles,id])
        count=result.rowCount||0
        if(!count)await client.query('DELETE FROM weave_company_announcement_images WHERE id=$1',[id])
      }else{
        const result=await client.query(`INSERT INTO notifications(user_id,type,title,content,from_user_id,from_user_name,link)
          SELECT id,$1,$2,$3,$4::uuid,$5,$6 FROM users
          WHERE is_active=true AND (cardinality($7::text[])=0 OR role::text=ANY($7::text[]))`,[type,title,content,authUser.id,sender,link||null,roles])
        count=result.rowCount||0
      }
      await client.query('COMMIT')
      return NextResponse.json({success:true,count,message:count?'Announcement saved to '+count+' notification inbox(es).':'No matching active users to notify.'})
    }catch(error){
      await client.query('ROLLBACK')
      throw error
    }finally{client.release()}
  }catch(error){
    console.error('Broadcast error:',error)
    return NextResponse.json({error:'Failed to send announcement'},{status:500})
  }
}
