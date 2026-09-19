import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql, query } from '@/lib/db'

const ALLOWED_ROLES = ['admin', 'agent', 'bridger']

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30')

    const posts = await query(`
      SELECT
        p.id, p.user_id as "userId", p.author_name as "authorName",
        p.author_role as "authorRole", p.author_avatar as "authorAvatar",
        p.content, p.media_url as "mediaUrl", p.media_type as "mediaType",
          p.witness_name as "witnessName", p.milestone_type as "milestoneType",
        p.created_at as "createdAt",
        COUNT(DISTINCT l.id)::int as "likeCount",
        COUNT(DISTINCT c.id)::int as "commentCount",
        BOOL_OR(l.user_id = $1::uuid) as "likedByMe"
      FROM status_posts p
      LEFT JOIN post_likes l ON l.post_id = p.id
      LEFT JOIN post_comments c ON c.post_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
      LIMIT $2
    `, [user.id, limit])

    return NextResponse.json({ success: true, posts })
  } catch (error: any) {
    console.error('Fetch posts error:', error)
    return NextResponse.json({ success: false, posts: [], error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Manual posts are admin-only. Client crossings post automatically via System Switch milestones.' }, { status: 403 })
    }

    const body = await request.json()
    const { content, mediaUrl = null, mediaType = null } = body

    if (!content?.trim() && !mediaUrl) {
      return NextResponse.json({ success: false, error: 'Post must have text or media' }, { status: 400 })
    }

    const avatarRows = await sql`SELECT avatar_url FROM users WHERE id = ${user.id}::uuid`
    const authorAvatar = avatarRows[0]?.avatar_url || '👤'

    const result = await sql`
      INSERT INTO status_posts (user_id, author_name, author_role, author_avatar, content, media_url, media_type)
      VALUES (${user.id}::uuid, ${user.name}, ${user.role}, ${authorAvatar}, ${content?.trim() || ''}, ${mediaUrl}, ${mediaType})
      RETURNING
        id, user_id as "userId", author_name as "authorName",
        author_role as "authorRole", author_avatar as "authorAvatar",
        content, media_url as "mediaUrl", media_type as "mediaType",
        created_at as "createdAt"
    `

    return NextResponse.json({ success: true, post: { ...result[0], likeCount: 0, commentCount: 0, likedByMe: false } })
  } catch (error: any) {
    console.error('Create post error:', error)
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
    const postId = searchParams.get('id')
    if (!postId) {
      return NextResponse.json({ success: false, error: 'Post id required' }, { status: 400 })
    }

    // Author can delete their own post; admin can delete any post
    const result = user.role === 'admin'
      ? await sql`DELETE FROM status_posts WHERE id = ${postId}::uuid RETURNING id`
      : await sql`DELETE FROM status_posts WHERE id = ${postId}::uuid AND user_id = ${user.id}::uuid RETURNING id`

    if (result.length === 0) {
      return NextResponse.json({ success: false, error: 'Post not found or unauthorized' }, { status: 404 })
    }

    return NextResponse.json({ success: true, postId: result[0].id })
  } catch (error: any) {
    console.error('Delete post error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
