import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'

const ALLOWED_ROLES = ['admin', 'agent', 'bridger']

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
   const user = await getAuthUser(request)
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const postId = id

    const existing = await sql`
      SELECT id FROM post_likes WHERE post_id = ${postId}::uuid AND user_id = ${user.id}::uuid
    `

    if (existing.length > 0) {
      await sql`DELETE FROM post_likes WHERE post_id = ${postId}::uuid AND user_id = ${user.id}::uuid`
      return NextResponse.json({ success: true, liked: false })
    } else {
      await sql`INSERT INTO post_likes (post_id, user_id) VALUES (${postId}::uuid, ${user.id}::uuid)`
      return NextResponse.json({ success: true, liked: true })
    }
  } catch (error: any) {
    console.error('Like toggle error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
