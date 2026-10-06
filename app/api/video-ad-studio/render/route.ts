import type { NextRequest } from 'next/server'
import { POST as renderVideo } from '@/app/api/admin/video-ads/render/route'

export const runtime = 'nodejs'
export const maxDuration = 900

export async function POST(request: NextRequest) {
  return renderVideo(request)
}
