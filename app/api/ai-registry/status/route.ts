import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'

export async function GET(request: NextRequest) {
  const authUser = await getAuthUser(request)
  if (!authUser || authUser.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const agents = [
    {
      id: 'eight',
      name: 'Eight',
      description: 'System operator & builder. Admin-only.',
      model: 'gemini-2.5-flash (Vertex AI)',
      auth: 'GCP service account (ADC)',
      accessLevel: 'Admin — live DB read, proposed writes',
      configured: !!process.env.GOOGLE_CLOUD_PROJECT,
    },
    {
      id: 'river',
      name: 'River',
      description: 'User-facing ecosystem guide.',
      model: 'gemini-2.5-flash (Vertex AI)',
      auth: 'GCP service account (ADC)',
      accessLevel: 'User-facing, read-only context',
      configured: !!process.env.GOOGLE_CLOUD_PROJECT,
    },
    {
      id: 'echo',
      name: 'Echo',
      description: 'Per-user private insight engine.',
      model: 'Echo analysis model',
      auth: 'Continuance-gated per user',
      accessLevel: "User's own activity only",
      configured: true,
    },
  ]

  return NextResponse.json({ success: true, agents })
}
