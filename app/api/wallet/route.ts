import { NextRequest, NextResponse } from 'next/server'
import { getWalletBalance } from '@/lib/tron-wallet'
import { getWalletByUserId, getTransactionsByUserId, createTransaction } from '@/lib/db'
import { getAuthUser } from '@/lib/auth-api'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const wallet = await getWalletByUserId(user.id)
    if (!wallet) {
      return NextResponse.json({
        wallet: { address: null, trx: 0, usdt: 0 },
        transactions: [],
        message: 'No external TRON wallet connected',
      })
    }

    const balance = await getWalletBalance(wallet.tron_address)
    const transactions = await getTransactionsByUserId(user.id, 20)

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
    }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Wallet GET error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const action = body.action
    const toAddress = typeof body.toAddress === 'string' ? body.toAddress.trim() : ''
    const amount = Number(body.amount)
    const tokenType = body.tokenType === 'USDT' ? 'USDT' : 'TRX'

    const wallet = await getWalletByUserId(user.id)
    if (!wallet) return NextResponse.json({ error: 'No external wallet found' }, { status: 400 })

    if (action !== 'send') return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    if (!toAddress || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Valid destination and amount are required' }, { status: 400 })
    }

    const tx = await createTransaction({
      userId: user.id,
      type: 'transfer',
      amount,
      currency: tokenType,
      fromAddress: wallet.tron_address,
      toAddress,
      description: `External transfer request: ${amount} ${tokenType} to ${toAddress}`,
    })

    return NextResponse.json({
      success: true,
      message: 'External transfer request submitted for Administration approval.',
      transactionId: tx.id,
    })
  } catch (error) {
    console.error('Wallet POST error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}
