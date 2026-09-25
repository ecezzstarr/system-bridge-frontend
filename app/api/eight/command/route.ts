import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth-api'
import { sql } from '@/lib/db'
import { SOURCE_ADMIN_ID } from '@/lib/core/originTruthLedger'
import { getInfrastructureRegistry } from '@/lib/weave-infrastructure'
import { getRegistryStatus } from '@/lib/core/systemRegistry'
import { getWalletBalance, sendTRX } from '@/lib/tron-wallet'
import { updateUserBalance, getUserByUsername, getUserByEmail } from '@/lib/mock-db'

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request)
    if (!authUser || authUser.role !== 'admin') {
      return NextResponse.json(
        { message: 'EIGHT is restricted to administrators only.' },
        { status: 403 }
      )
    }

    const { command } = await request.json()
    const adminId = authUser.id

    if (!command) {
      return NextResponse.json(
        { message: 'Missing command' },
        { status: 400 }
      )
    }

    console.log('[v0] EIGHT cross-system operator - command received:', command)

    const companyWallet = process.env.COMPANY_TRON_WALLET || 'THGBvmPt3XEb8mbSRXViA93GkW3PpCanJk'
    const platformWallet = process.env.PLATFORM_WALLET_PUBLIC_KEY || 'TNzNPekX1tbeFYRe3DPjnNV2dG6QfvHymt'

    // EIGHT command patterns
    const sweepMatch = command.toLowerCase().match(/sweep\s+(\d+)\s+(?:trx\s+)?to\s+company\s+wallet/i)
    const statusMatch = command.toLowerCase().match(/status/i)
    const systemsMatch = command.toLowerCase().match(/systems|network|connected/i)
    const helpMatch = command.toLowerCase().match(/help|what\s+can|capabilities/i)

    // Handle sweep command
    if (sweepMatch && sweepMatch[1]) {
      const amount = parseInt(sweepMatch[1])
      const platformWalletAddress = process.env.PLATFORM_WALLET_PUBLIC_KEY
      
      if (!platformWalletAddress) {
        return NextResponse.json({
          success: false,
          message: 'Error: PLATFORM_WALLET_PUBLIC_KEY environment variable not configured',
        }, { status: 500 })
      }
      
      // Get REAL balance from TRON blockchain
      let realBalance = 0
      try {
        const walletData = await getWalletBalance(platformWalletAddress)
        realBalance = walletData.trx
        console.log('[v0] EIGHT: Platform wallet TRON balance:', realBalance, 'Address:', platformWalletAddress)
      } catch (error: any) {
        console.log('[v0] EIGHT: Error fetching TRON balance:', error.message || error)
        return NextResponse.json({
          success: false,
          message: `Error: Could not fetch platform wallet balance from TRON blockchain. Details: ${error.message || error}`,
        }, { status: 500 })
      }

      // Check if wallet has enough balance (keep 1 TRX for fees)
      if (realBalance < amount + 1) {
        return NextResponse.json({
          success: false,
          message: `EIGHT SWEEP REJECTED: Insufficient balance on TRON blockchain. Available: ${realBalance.toFixed(2)} TRX, Requested: ${amount} TRX (need +1 TRX for fees)`,
        }, { status: 400 })
      }

      // Get private key for signing
      const privateKey = process.env.PLATFORM_WALLET_PRIVATE_KEY
      if (!privateKey) {
        return NextResponse.json({
          success: false,
          message: 'Error: PLATFORM_WALLET_PRIVATE_KEY not configured. Cannot sign transaction.',
        }, { status: 500 })
      }

      // Execute the actual TRX transfer on TRON blockchain
      const transferResult = await sendTRX(
        platformWalletAddress,
        companyWallet,
        amount,
        privateKey
      )

      if (!transferResult.success) {
        // Save failed transaction to database
        await sql`
          INSERT INTO transactions (type, amount, currency, status, from_address, to_address, description, metadata, created_at)
          VALUES (
            'sweep',
            ${amount},
            'TRX',
            'failed',
            ${platformWalletAddress},
            ${companyWallet},
            ${`EIGHT sweep failed: ${transferResult.error}`},
            ${JSON.stringify({ adminId, error: transferResult.error })}::jsonb,
            NOW()
          )
        `

        return NextResponse.json({
          success: false,
          message: `EIGHT SWEEP FAILED: ${transferResult.error}`,
        }, { status: 500 })
      }

      // Save successful transaction to database
      const txId = transferResult.txId || `txn_${Date.now()}`
      await sql`
        INSERT INTO transactions (type, amount, currency, status, tx_hash, from_address, to_address, description, metadata, created_at, completed_at)
        VALUES (
          'sweep',
          ${amount},
          'TRX',
          'completed',
          ${txId},
          ${platformWalletAddress},
          ${companyWallet},
          ${`EIGHT sweep executed: ${amount} TRX from platform vault to company wallet`},
          ${JSON.stringify({ adminId, balanceBefore: realBalance, balanceAfter: realBalance - amount })}::jsonb,
          NOW(),
          NOW()
        )
      `

      return NextResponse.json({
        success: true,
        message: `✓ EIGHT SWEEP EXECUTED SUCCESSFULLY

${amount} TRX transferred from platform vault to company wallet

From: ${platformWalletAddress}
To: ${companyWallet}
Amount: ${amount} TRX
TX ID: ${txId}

Previous Balance: ${realBalance.toFixed(2)} TRX
New Balance: ~${(realBalance - amount).toFixed(2)} TRX

Transaction broadcast to TRON Mainnet and saved to database.`,
        data: {
          txId,
          amount,
          fromWallet: platformWalletAddress,
          toWallet: companyWallet,
          walletBalance: realBalance,
          balanceAfterSweep: realBalance - amount,
          source: 'TRON Mainnet (api.trongrid.io)',
          savedToDb: true,
        },
      })
    }

    if (statusMatch) {
      // Get all connected systems
      const registry = await getInfrastructureRegistry()
      const systems = registry.map((s:any)=>({name:s.name,status:s.enabled?'active':'paused',domain:s.public_url,deploymentType:s.deployment_target}))
      const activeSystems = systems.filter(s => s.status === 'active').length
      const systemsList = systems.map(s => `  ✓ ${s.name}`).join('\n')
      
      // Get transaction count from database
      const txCountResult = await sql`SELECT COUNT(*) as count FROM transactions WHERE type = 'sweep'`
      const txCount = (txCountResult as any[])[0]?.count || 0
      
      return NextResponse.json({
        success: true,
        message: `EIGHT Multi-System Control Status:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📡 MANAGED SYSTEMS: ${systems.length} total | ${activeSystems} active
${systemsList}

🔐 Platform Vault: ${platformWallet.slice(0, 10)}... (Secured)
💰 Company Wallet: ${companyWallet.slice(0, 10)}... (Active)
⚙️ Status: OPERATIONAL
📊 Cross-System Transactions: ${txCount} recorded in database
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        data: { 
          status: 'operational', 
          transactionCount: txCount,
          systemsCount: systems.length,
          activeSystems,
          systems: systems.map(s => ({ name: s.name, status: s.status }))
        }
      })
    }

    if (systemsMatch) {
      // Get all connected systems
      const registry = await getInfrastructureRegistry()
      const systems = registry.map((s:any)=>({id:s.system_key,name:s.name,status:s.enabled?'active':'paused',domain:s.public_url,deploymentType:s.deployment_target}))
      
      const systemsList = systems.map((sys, idx) => {
        const isOrigin = idx === 0
        const isWorkshop = sys.name.includes('Workshop')
        const icon = isOrigin ? '🔵' : isWorkshop ? '🔒' : '🟢'
        return `  ${icon} ${sys.name} [${sys.status.toUpperCase()}]`
      }).join('\n')
      
      return NextResponse.json({
        success: true,
        message: `EIGHT Unified Ecosystem Architecture:

🔵 Origin Authority (Primary):
  WEAVE - Ecosystem foundation and ledger

🟢 Connected Service Systems:
  WEAVE.ONLINE - Client-facing service delivery

🔒 Private Production Layer:
  WEAVE.WORKSHOP - Admin workshop & refinement

Network Status:
${systemsList}

ONE continuous ecosystem with multiple densities.
All systems connected through Origin Truth Ledger.
Admin (${SOURCE_ADMIN_ID}) maintains complete ecosystem continuity.`,
        data: { 
          systems: systems.map(s => ({
            id: s.id,
            name: s.name,
            status: s.status,
            domain: s.domain,
            deploymentType: s.deploymentType
          }))
        }
      })
    }

    if (helpMatch) {
      return NextResponse.json({
        success: true,
        message: `EIGHT Unified Ecosystem Operator - WEAVE

I manage ONE continuous ecosystem with 3 interconnected systems:
🔵 WEAVE (Origin Authority)
🟢 WEAVE.ONLINE (Service System)
🔒 WEAVE.WORKSHOP (Admin Workshop)

ADMIN OPERATIONS:
1. "sweep X trx to company wallet" - Execute fund sweep across ecosystem
2. "status" - Unified ecosystem status report
3. "systems" - View all connected systems
4. "help" - Show this help menu

I maintain ecosystem continuity, wallet authority, and system coordination.
Only ${SOURCE_ADMIN_ID} can interact with me.`,
        data: { command_type: 'help' }
      })
    }

    // Default helpful response
    return NextResponse.json({
      success: true,
      message: `EIGHT Unified Ecosystem Operator - Command Acknowledged

Managing: 3 Interconnected Systems
🔵 WEAVE (Origin) + 🟢 WEAVE.ONLINE (Service) + 🔒 WEAVE.WORKSHOP (Workshop)

Quick Commands:
• "sweep 10 trx to company wallet" - Execute ecosystem sweep
• "status" - Unified ecosystem status  
• "systems" - View all 3 systems
• "help" - Show available commands`,
      data: { command_received: command }
    })

  } catch (error: any) {
    console.error('[v0] EIGHT API error:', error)
    return NextResponse.json(
      { message: 'Error processing EIGHT command', error: error.message },
      { status: 500 }
    )
  }
}

// GET to view transaction logs from database (admin only)
export async function GET(request: NextRequest) {
  try {
    const authUser=await getAuthUser(request)
    if (!authUser) return NextResponse.json({ error:'Unauthorized' },{ status:401 })
    if (authUser.role!=='admin') return NextResponse.json({ error:'Forbidden' },{ status:403 })

    const transactions = await sql`
      SELECT id, type, amount, currency, status, tx_hash, from_address, to_address, description, metadata, created_at, completed_at
      FROM transactions
      WHERE type = 'sweep'
      ORDER BY created_at DESC
      LIMIT 100
    `
    
    return NextResponse.json({
      transactions,
      totalTransactions: (transactions as any[]).length,
      timestamp: new Date().toISOString(),
      source: 'Database',
    })
  } catch (error: any) {
    return NextResponse.json({
      transactions: [],
      totalTransactions: 0,
      error: error.message,
      timestamp: new Date().toISOString(),
    })
  }
}
