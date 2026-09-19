import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql, query } from '@/lib/db'

const ALLOWED_ROLES = ['admin', 'agent', 'bridger']

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
   const user = await getAuthUser(request)
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const comments = await query(`
      SELECT id, post_id as "postId", user_id as "userId", author_name as "authorName",
             author_role as "authorRole", content, created_at as "createdAt"
      FROM post_comments
      WHERE post_id = $1
      ORDER BY created_at ASC
    `, [id])

    return NextResponse.json({ success: true, comments })
  } catch (error: any) {
    console.error('Fetch comments error:', error)
    return NextResponse.json({ success: false, comments: [], error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
   const user = await getAuthUser(request)
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { content } = body
    if (!content?.trim()) {
      return NextResponse.json({ success: false, error: 'Comment cannot be empty' }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO post_comments (post_id, user_id, author_name, author_role, content)
      VALUES (${id}::uuid, ${user.id}::uuid, ${user.name}, ${user.role}, ${content.trim()})
      RETURNING id, post_id as "postId", user_id as "userId", author_name as "authorName",
                author_role as "authorRole", content, created_at as "createdAt"
    `

    return NextResponse.json({ success: true, comment: result[0] })
  } catch (error: any) {
    console.error('Add comment error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('commentId')
    if (!commentId) {
      return NextResponse.json({ success: false, error: 'commentId required' }, { status: 400 })
    }

    const result = user.role === 'admin'
      ? await sql`DELETE FROM post_comments WHERE id = ${commentId}::uuid RETURNING id`
      : await sql`DELETE FROM post_comments WHERE id = ${commentId}::uuid AND user_id = ${user.id}::uuid RETURNING id`

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: 'Comment not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ success: true, commentId: result[0].id })
  } catch (error: any) {
    console.error('Delete comment error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
