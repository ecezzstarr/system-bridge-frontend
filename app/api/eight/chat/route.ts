import { NextRequest, NextResponse } from 'next/server'
import { askEight, eightBuildFeature, eightRefineCode, eightBuildUI, eightCreateAPI, eightDebug } from '@/lib/eight-engine'

export async function POST(request: NextRequest) {
  try {
    const { message, mode, context } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    let response

    switch (mode) {
      case 'build':
        response = await eightBuildFeature(message, context?.code)
        break
      case 'refine':
        response = await eightRefineCode(context?.code || '', message)
        break
      case 'ui':
        response = await eightBuildUI(message, context?.design)
        break
      case 'api':
        response = await eightCreateAPI(message, context?.patterns)
        break
      case 'debug':
        response = await eightDebug(message, context?.code || '')
        break
      default:
        // General conversation
        response = await askEight(message, context)
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('Eight chat error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Eight is unavailable',
      message: error.message 
    }, { status: 500 })
  }
}
