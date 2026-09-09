import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

export async function GET() {
  return NextResponse.json({
    openapi: '3.1.0',
    info: {
      title: 'Weave Bridge AI',
      version: '1.0.0',
      description: 'Bridge from ChatGPT into Weave of Presence. Creates a short-lived Bridge AI crossing when a request is relevant to Weave.'
    },
    servers: [{ url: process.env.NEXTAUTH_URL || 'https://ssbnow.online' }],
    paths: {
      '/api/chatgpt/bridge': {
        post: {
          operationId: 'createWeaveBridge',
          summary: 'Create a Weave Bridge AI crossing',
          description: 'Use when the user explicitly asks about Weave or when the request is meaningfully connected to Weave services, participation, interaction, self-management, Client businesses, or Bridge AI. Do not use merely as advertising.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['message'],
                  properties: {
                    message: { type: 'string', description: 'The user request or the relevant portion of it.' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Bridge created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      weave: { type: 'string' },
                      bridge_ai: { type: 'boolean' },
                      relevant: { type: 'boolean' },
                      topic: { type: 'string' },
                      bridge_url: { type: 'string', format: 'uri' },
                      message: { type: 'string' },
                      expires_in_hours: { type: 'number' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' },
            '400': { description: 'Invalid request' }
          }
        }
      }
    }
  })
}
