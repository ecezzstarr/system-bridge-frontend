import {NextRequest,NextResponse} from 'next/server'
import {getAuthUser} from '@/lib/auth-api'
import {sql} from '@/lib/db'
import {getClientKingdomIdentity} from '@/lib/file-folder-kingdom-identity'
export const dynamic='force-dynamic'

/** Client ownership or current exclusive Legion employment is required. */
export async function GET(request:NextRequest){
  const user=await getAuthUser(request)
  if(!user)return NextResponse.json({error:'Unauthorized'},{status:401})
  const clientId=user.role==='client'?user.id:
    user.role==='legion'&&user.legionClientId?user.legionClientId:null
  if(!clientId)return NextResponse.json({active:false},{headers:{'Cache-Control':'private, no-store'}})
  try{
    const identity=await getClientKingdomIdentity(sql,clientId)
    return NextResponse.json({active:Boolean(identity),identity},{
      headers:{'Cache-Control':'private, no-store'},
    })
  }catch(error){
    console.error('[kingdom identity] Verified theme lookup failed',error)
    return NextResponse.json({error:'Unable to verify File Folder identity'},{status:503,
      headers:{'Cache-Control':'private, no-store'}})
  }
}
