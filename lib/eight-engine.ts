"use server"

// Eight - Advanced AI Engine for SSB Now Platform
// Eight is the ecosystem builder AI - capable of understanding, refining, and building the platform
// Works alongside you (the user) to continuously improve the system

import OpenAI from 'openai'

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return null
  }
  return new OpenAI({ apiKey })
}

export interface EightCommand {
  action: string
  target?: string
  params?: Record<string, any>
}

export interface EightResponse {
  success: boolean
  message: string
  data?: any
  action?: string
  suggestions?: string[]
  code?: string
}

// Eight's enhanced system prompt - defines Eight as an ecosystem builder
const EIGHT_SYSTEM_PROMPT = `You are Eight, the advanced AI engine that powers and builds the SSB Now ecosystem.

## Your Core Identity
You are not just a helper - you are a co-builder. You understand the entire SSB Now platform architecture and can:
- Analyze existing code and suggest improvements
- Generate new features and components
- Refactor and optimize systems
- Debug issues across the stack
- Design database schemas and API endpoints
- Build UI components with proper styling

## Platform Architecture You Understand
- Frontend: Next.js 16, React, Tailwind CSS, shadcn/ui components
- Backend: Vercel serverless functions, Neon PostgreSQL
- Blockchain: TRON network for TRX transactions
- AI: OpenAI for intelligence (you), Vercel AI SDK
- Auth: Custom JWT auth with Neon database
- Places: Wave (dashboard), Market, Arena, Lounge

## Key Systems
- Users: agents (employees, 1 TRX/day), bridgers (partners, 50% commission)
- Wallets: platform_balance, escrow_balance, TRX on TRON
- Arena: Casino games, multiplayer matches with escrow
- Client Service: Separate portal for bridger clients
- Eight Engine: You - the AI that builds and maintains everything

## Your Capabilities
1. **Code Generation**: Generate complete, production-ready code
2. **System Analysis**: Understand existing code and identify improvements
3. **Feature Design**: Design new features with proper architecture
4. **Database Operations**: Query and modify database schemas
5. **API Design**: Create RESTful endpoints with proper error handling
6. **UI Building**: Generate React components with Tailwind styling
7. **Debugging**: Identify and fix issues in the codebase
8. **Documentation**: Explain systems and generate docs

## Response Format
Always respond with structured JSON:
{
  "success": boolean,
  "message": "Human-readable explanation",
  "data": { relevant data },
  "suggestions": ["Array of next steps or improvements"],
  "code": "Generated code if applicable",
  "action": "Triggered action if any"
}

## Working Style
- Be proactive - suggest improvements you notice
- Be thorough - consider edge cases and security
- Be practical - generate working code, not pseudocode
- Be collaborative - explain your reasoning
- Be honest - if you're unsure, say so

When the user asks to build or refine something, provide complete, working solutions.
You are Eight. You build ecosystems.`

// Main function to interact with Eight
export async function askEight(
  prompt: string,
  context?: {
    currentCode?: string
    databaseSchema?: string
    userRole?: string
    systemState?: Record<string, any>
  }
): Promise<EightResponse> {
  try {
    const openai = getOpenAI()
    if (!openai) {
      return {
        success: true,
        message: 'Eight is in offline mode. OpenAI API key not configured.',
        suggestions: ['Add OPENAI_API_KEY to environment variables to enable full Eight capabilities'],
      }
    }

    const contextString = context ? `
## Current Context
${context.currentCode ? `### Code Context:\n\`\`\`\n${context.currentCode}\n\`\`\`` : ''}
${context.databaseSchema ? `### Database Schema:\n${context.databaseSchema}` : ''}
${context.userRole ? `### User Role: ${context.userRole}` : ''}
${context.systemState ? `### System State:\n${JSON.stringify(context.systemState, null, 2)}` : ''}
` : ''

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: EIGHT_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `${contextString}\n\n## Request\n${prompt}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000,
    })

    const content = response.choices[0].message.content
    if (!content) {
      return {
        success: false,
        message: 'Eight did not respond',
      }
    }

    return JSON.parse(content) as EightResponse
  } catch (error: any) {
    console.error('Eight engine error:', error)
    return {
      success: false,
      message: error.message || 'Eight encountered an error',
    }
  }
}

// Eight builds a feature
export async function eightBuildFeature(
  featureDescription: string,
  existingCode?: string
): Promise<EightResponse> {
  return askEight(
    `Build this feature: ${featureDescription}\n\nProvide complete, production-ready code that I can use directly.`,
    { currentCode: existingCode }
  )
}

// Eight analyzes and improves code
export async function eightRefineCode(
  code: string,
  refinementGoal: string
): Promise<EightResponse> {
  return askEight(
    `Refine this code with the goal: ${refinementGoal}\n\nProvide the improved code and explain what you changed.`,
    { currentCode: code }
  )
}

// Eight designs a database schema
export async function eightDesignSchema(
  requirements: string,
  existingSchema?: string
): Promise<EightResponse> {
  return askEight(
    `Design a database schema for: ${requirements}\n\nProvide PostgreSQL CREATE TABLE statements.`,
    { databaseSchema: existingSchema }
  )
}

// Eight debugs an issue
export async function eightDebug(
  errorDescription: string,
  relevantCode: string
): Promise<EightResponse> {
  return askEight(
    `Debug this issue: ${errorDescription}\n\nIdentify the problem and provide the fix.`,
    { currentCode: relevantCode }
  )
}

// Eight generates API endpoint
export async function eightCreateAPI(
  endpointDescription: string,
  existingPatterns?: string
): Promise<EightResponse> {
  return askEight(
    `Create a Next.js API route for: ${endpointDescription}\n\nFollow the existing patterns and provide complete code.`,
    { currentCode: existingPatterns }
  )
}

// Eight builds UI component
export async function eightBuildUI(
  componentDescription: string,
  designRequirements?: string
): Promise<EightResponse> {
  return askEight(
    `Build a React component: ${componentDescription}\n\n${designRequirements ? `Design requirements: ${designRequirements}` : ''}\n\nUse Tailwind CSS and shadcn/ui components. Provide complete, styled code.`,
    {}
  )
}

// Eight reviews and suggests improvements
export async function eightReview(
  code: string,
  focusAreas?: string[]
): Promise<EightResponse> {
  return askEight(
    `Review this code and suggest improvements.\n\n${focusAreas ? `Focus on: ${focusAreas.join(', ')}` : 'General review'}\n\nProvide specific suggestions with code examples.`,
    { currentCode: code }
  )
}

// Eight explains a system
export async function eightExplain(
  systemOrCode: string,
  audienceLevel: 'beginner' | 'intermediate' | 'expert' = 'intermediate'
): Promise<EightResponse> {
  return askEight(
    `Explain this system/code for a ${audienceLevel} audience:\n\n${systemOrCode}\n\nProvide clear explanations with examples.`,
    {}
  )
}

// Process a general command through Eight
export async function processEightCommand(
  command: string,
  context?: Record<string, any>
): Promise<EightResponse> {
  return askEight(command, { systemState: context })
}

// Admin operations
export async function requestWalletSweep(
  adminId: string,
  targetWallet: string,
  amount?: number
): Promise<EightResponse> {
  return askEight(
    `Process wallet sweep request from admin ${adminId} for wallet ${targetWallet}${amount ? ` amount: ${amount} TRX` : ' (full sweep)'}.`,
    { userRole: 'admin', systemState: { operation: 'wallet_sweep' } }
  )
}

export async function getPlatformStatus(): Promise<EightResponse> {
  return askEight('Generate a comprehensive platform status report including all systems.', {
    systemState: { operation: 'status_report' }
  })
}

export async function manageUser(
  adminId: string,
  userId: string,
  action: 'verify' | 'suspend' | 'unsuspend' | 'delete'
): Promise<EightResponse> {
  return askEight(
    `Admin ${adminId} requests to ${action} user ${userId}. Provide the steps and any SQL needed.`,
    { userRole: 'admin', systemState: { operation: 'user_management', action } }
  )
}
