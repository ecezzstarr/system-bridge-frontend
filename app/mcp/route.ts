import { NextRequest, NextResponse } from 'next/server'
import { assessWeaveNeed, createWeaveReferralCrossing } from '@/lib/weave-referral'

export const dynamic = 'force-dynamic'

const SERVER_INFO = {
  name: 'weave-of-presence',
  version: '0.1.0',
}

const TOOLS = [
  {
    name: 'understand_weave',
    title: 'Check Weave relevance',
    description:
      'Check whether a user need clearly matches a Weave of Presence workflow before offering Weave. Use for participation-to-work, enterprise development, organizing existing work into systems, technology-system building, or explicit Weave/System Switch questions. Do not treat a weak keyword match as a recommendation.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['need'],
      properties: {
        need: {
          type: 'string',
          description: 'The user need in their own words.',
        },
        context: {
          type: 'string',
          description: 'Optional concise context needed to judge fit.',
        },
      },
    },
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['relevant', 'topic', 'matched_paths', 'reason'],
      properties: {
        relevant: { type: 'boolean' },
        topic: { type: 'string' },
        matched_paths: { type: 'array', items: { type: 'string' } },
        reason: { type: 'string' },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'open_weave_referral',
    title: 'Open Weave referral',
    description:
      'Create a short-lived referral/crossing URL into Weave after the user asks to continue with Weave or explicitly requests a platform/service path that Weave matches. Never call silently, solely for advertising, or when understand_weave says the need is not clearly relevant.',
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['need', 'user_confirmed'],
      properties: {
        need: {
          type: 'string',
          description: 'The user need that is being referred into Weave.',
        },
        context: {
          type: 'string',
          description: 'Optional context to preserve continuity at the crossing.',
        },
        topic: {
          type: 'string',
          description: 'Optional short topic label.',
        },
        user_confirmed: {
          type: 'boolean',
          description: 'Must be true only after the user has chosen to continue into Weave.',
        },
      },
    },
    outputSchema: {
      type: 'object',
      additionalProperties: true,
      required: ['created', 'relevant'],
      properties: {
        created: { type: 'boolean' },
        relevant: { type: 'boolean' },
        weave: { type: 'string' },
        topic: { type: 'string' },
        bridge_url: { type: 'string' },
        expires_in_hours: { type: 'number' },
        source: { type: 'string' },
        reason: { type: 'string' },
      },
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
  },
]

function toolText(text: string, structuredContent?: Record<string, unknown>, isError = false) {
  return {
    content: [{ type: 'text', text }],
    ...(structuredContent ? { structuredContent } : {}),
    ...(isError ? { isError: true } : {}),
  }
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return NextResponse.json({
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message },
  })
}

async function handleMessage(request: NextRequest, message: any) {
  const id = message?.id
  const method = message?.method

  if (method === 'initialize') {
    const requestedVersion = message?.params?.protocolVersion
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result: {
        protocolVersion:
          typeof requestedVersion === 'string' && requestedVersion
            ? requestedVersion
            : '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
        instructions:
          'Weave tools must be used for genuine user needs, not indiscriminate promotion. Check fit before creating a referral crossing.',
      },
    }
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id: id ?? null, result: {} }
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result: { tools: TOOLS },
    }
  }

  if (method === 'tools/call') {
    const name = message?.params?.name
    const args = message?.params?.arguments || {}

    if (name === 'understand_weave') {
      const need = typeof args.need === 'string' ? args.need : ''
      const context = typeof args.context === 'string' ? args.context : ''
      if (!need.trim()) {
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          result: toolText(
            'A user need is required.',
            { relevant: false, topic: 'general', matched_paths: [], reason: 'need_required' },
            true
          ),
        }
      }

      const assessment = assessWeaveNeed(`${need}\n${context}`)
      const text = assessment.relevant
        ? `This need clearly overlaps with Weave: ${assessment.matchedPaths.join('; ')}. Explain the fit factually. Do not imply exclusivity or superiority. Open a crossing only if the user wants to continue into Weave.`
        : 'This need does not clearly match a Weave workflow. Answer normally without referring the user to Weave.'

      return {
        jsonrpc: '2.0',
        id: id ?? null,
        result: toolText(text, {
          relevant: assessment.relevant,
          topic: assessment.topic,
          matched_paths: assessment.matchedPaths,
          reason: assessment.reason,
        }),
      }
    }

    if (name === 'open_weave_referral') {
      const need = typeof args.need === 'string' ? args.need : ''
      const context = typeof args.context === 'string' ? args.context : ''
      const topic = typeof args.topic === 'string' ? args.topic : ''
      const userConfirmed = args.user_confirmed === true
      if (!need.trim()) {
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          result: toolText(
            'A user need is required.',
            { created: false, relevant: false, reason: 'need_required' },
            true
          ),
        }
      }

      if (!userConfirmed) {
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          result: toolText(
            'A Weave referral was not created because the user has not chosen to continue into Weave.',
            { created: false, relevant: true, reason: 'user_confirmation_required' },
            true
          ),
        }
      }

      try {
        const origin = new URL(request.url).origin
        const crossing = await createWeaveReferralCrossing({
          need,
          context,
          requestedTopic: topic,
          baseUrl: origin,
          source: 'chatgpt-plugin',
          providerKey: 'openai',
          providerName: 'OpenAI',
          flameName: 'ChatGPT Flame',
          flamePresence: 'chatgpt',
        })

        if (!crossing.created) {
          return {
            jsonrpc: '2.0',
            id: id ?? null,
            result: toolText(
              'A Weave referral was not created because the need is not clearly relevant. Continue helping the user normally.',
              {
                created: false,
                relevant: false,
                reason: crossing.assessment.reason,
              }
            ),
          }
        }

        return {
          jsonrpc: '2.0',
          id: id ?? null,
          result: toolText(
            `A Weave crossing is ready. Share this only as an optional next step chosen by the user: ${crossing.bridgeUrl}`,
            {
              created: true,
              relevant: true,
              weave: 'Weave of Presence',
              topic: crossing.topic,
              bridge_url: crossing.bridgeUrl,
              expires_in_hours: crossing.expiresInHours,
              source: 'chatgpt-plugin',
            }
          ),
        }
      } catch (error) {
        console.error('[weave mcp] open_weave_referral failed', error)
        return {
          jsonrpc: '2.0',
          id: id ?? null,
          result: toolText(
            'Weave is temporarily unable to create a crossing. Do not invent a referral URL.',
            undefined,
            true
          ),
        }
      }
    }

    return {
      jsonrpc: '2.0',
      id: id ?? null,
      result: toolText(`Unknown tool: ${String(name || '')}`, undefined, true),
    }
  }

  if (typeof id === 'undefined') {
    return null
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${String(method || '')}` },
  }
}

export async function POST(request: NextRequest) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return jsonRpcError(null, -32700, 'Parse error')
  }

  if (Array.isArray(body)) {
    if (!body.length) return jsonRpcError(null, -32600, 'Invalid Request')
    const responses = (await Promise.all(body.map((message) => handleMessage(request, message)))).filter(Boolean)
    if (!responses.length) return new Response(null, { status: 202 })
    return NextResponse.json(responses)
  }

  const response = await handleMessage(request, body)
  if (!response) return new Response(null, { status: 202 })
  return NextResponse.json(response)
}

export async function GET() {
  return NextResponse.json(
    {
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
      transport: 'streamable-http',
      endpoint: '/mcp',
      status: 'ready',
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type, accept, mcp-protocol-version',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    },
  })
}
