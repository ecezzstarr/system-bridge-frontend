import { NextRequest, NextResponse } from 'next/server'
import { getWalletBalance, sendTRX, sendUSDT } from '@/lib/tron-wallet'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getWalletByUserId, getTransactionsByUserId, createTransaction, updateTransactionStatus } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get wallet from database
    const wallet = await getWalletByUserId(session.user.id)
    if (!wallet) {
      return NextResponse.json({ 
        wallet: { address: null, trx: 0, usdt: 0 },
        transactions: [],
        message: 'No wallet connected' 
      })
    }

    // Get real balance from TRON network
    const balance = await getWalletBalance(wallet.tron_address)
    
    // Get transactions from database
    const transactions = await getTransactionsByUserId(session.user.id, 20)
    
    return NextResponse.json({
      wallet: {
        id: wallet.id,
        address: balance.address,
        trx: balance.trx,
        usdt: balance.usdt,
        tokens: balance.tokens,
      },
      transactions: transactions.map((tx: Record<string, unknown>) => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        txHash: tx.tx_hash,
        fromAddress: tx.from_address,
        toAddress: tx.to_address,
        description: tx.description,
        createdAt: tx.created_at,
      })),
    })
  } catch (error: unknown) {
    console.error('Wallet GET error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, toAddress, amount, tokenType } = body

    // Get user's wallet
    const wallet = await getWalletByUserId(session.user.id)
    if (!wallet) {
      return NextResponse.json({ error: 'No wallet found' }, { status: 400 })
    }

    if (action === 'send') {
      // Create pending transaction record
      const tx = await createTransaction({
        userId: session.user.id,
        type: 'transfer',
        amount: amount,
        currency: tokenType || 'TRX',
        fromAddress: wallet.tron_address,
        toAddress: toAddress,
        description: `Send ${amount} ${tokenType || 'TRX'} to ${toAddress}`,
      })

      // For now, users cannot send directly - they need Eight (admin) to approve
      // This is a security measure for real funds
      return NextResponse.json({ 
        success: true, 
        message: 'Transfer request submitted. Awaiting Eight approval.',
        transactionId: tx.id,
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: unknown) {
    console.error('Wallet POST error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
