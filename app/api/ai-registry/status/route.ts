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
      description: 'Immediate private guidance for all WEAVE roles, with optional activity analysis.',
      model: 'Echo analysis model',
      auth: 'Active authenticated WEAVE account; free, no recurring subscription',
      accessLevel: "User's own activity only",
      configured: true,
    },
  ]

  return NextResponse.json({ success: true, agents })
}
