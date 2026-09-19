import {NextResponse} from 'next/server'
import {getSql} from '@/lib/db'

export async function GET(){

 const sql=getSql()

 await sql`
 ALTER TABLE deposits
 ADD COLUMN IF NOT EXISTS receipt_text TEXT,
 ADD COLUMN IF NOT EXISTS receipt_url TEXT,
 ADD COLUMN IF NOT EXISTS verified_by UUID,
 ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
 `

 return NextResponse.json({
  success:true,
  message:'Deposit receipt fields added'
 })
}
