import { NextRequest, NextResponse } from 'next/server'
import { sweepToCompanyWallet, getWalletBalance } from '@/lib/tron-wallet'
import { processEightCommand } from '@/lib/eight-engine'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const userRole = (session.user as any).role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { walletAddress, privateKey, tokenType = 'ALL' } = body

    if (!walletAddress || !privateKey) {
      return NextResponse.json({ error: 'Wallet address and private key required' }, { status: 400 })
    }

    // Log sweep attempt with Eight
    const eightLog = await processEightCommand(
      `Admin sweep initiated by ${session.user.email} for wallet ${walletAddress}`,
      { 
        adminEmail: session.user.email,
        walletAddress,
        tokenType,
        operation: 'wallet_sweep'
      }
    )

    // Get current balance before sweep
    const balanceBefore = await getWalletBalance(walletAddress)

    // Execute sweep
    const result = await sweepToCompanyWallet(walletAddress, privateKey, tokenType)

    // Get balance after sweep
    const balanceAfter = await getWalletBalance(walletAddress)

    // Log result with Eight
    await processEightCommand(
      `Sweep ${result.success ? 'completed' : 'failed'} for wallet ${walletAddress}`,
      {
        success: result.success,
        txId: result.txId,
        balanceBefore: { trx: balanceBefore.trx, usdt: balanceBefore.usdt },
        balanceAfter: { trx: balanceAfter.trx, usdt: balanceAfter.usdt },
        error: result.error,
      }
    )

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Wallet sweep completed successfully',
        txId: result.txId,
        swept: {
          trx: balanceBefore.trx - balanceAfter.trx,
          usdt: balanceBefore.usdt - balanceAfter.usdt,
        },
        eightResponse: eightLog.message,
      })
    } else {
      return NextResponse.json({ 
        success: false,
        error: result.error 
      }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Admin sweep error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Get sweep history (from Eight logs)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as any).role
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Query Eight for sweep history
    const eightResponse = await processEightCommand(
      'Get recent wallet sweep operations history',
      { operation: 'get_sweep_history' }
    )

    return NextResponse.json({
      success: true,
      history: eightResponse.data || [],
      message: eightResponse.message,
    })
  } catch (error: any) {
    console.error('Get sweep history error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
