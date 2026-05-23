"use server"

// Flutterwave Payment Integration for SSB Now
// Handles deposits and payment processing

const FLUTTERWAVE_SECRET_KEY = process.env.FLW_SECRET_KEY

interface PaymentInitResponse {
  success: boolean
  paymentLink?: string
  reference?: string
  error?: string
}

interface PaymentVerifyResponse {
  success: boolean
  status?: 'successful' | 'pending' | 'failed'
  amount?: number
  currency?: string
  error?: string
}

// Initialize a payment
export async function initializePayment(
  amount: number,
  currency: string = 'USD',
  email: string,
  name: string,
  userId: string,
  redirectUrl: string
): Promise<PaymentInitResponse> {
  try {
    const reference = `SSB-${userId}-${Date.now()}`
    
    const response = await fetch('https://api.flutterwave.com/v3/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tx_ref: reference,
        amount,
        currency,
        redirect_url: redirectUrl,
        customer: {
          email,
          name,
        },
        customizations: {
          title: 'SSB Now',
          description: 'Wallet Deposit',
          logo: 'https://ssbnow.online/logo.png',
        },
        meta: {
          userId,
          type: 'wallet_deposit',
        },
      }),
    })
    
    const data = await response.json()
    
    if (data.status === 'success') {
      return {
        success: true,
        paymentLink: data.data.link,
        reference,
      }
    }
    
    return {
      success: false,
      error: data.message || 'Failed to initialize payment',
    }
  } catch (error: any) {
    console.error('Flutterwave init error:', error)
    return {
      success: false,
      error: error.message || 'Payment initialization failed',
    }
  }
}

// Verify a payment
export async function verifyPayment(transactionId: string): Promise<PaymentVerifyResponse> {
  try {
    const response = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    )
    
    const data = await response.json()
    
    if (data.status === 'success' && data.data) {
      return {
        success: true,
        status: data.data.status,
        amount: data.data.amount,
        currency: data.data.currency,
      }
    }
    
    return {
      success: false,
      error: data.message || 'Payment verification failed',
    }
  } catch (error: any) {
    console.error('Flutterwave verify error:', error)
    return {
      success: false,
      error: error.message || 'Payment verification failed',
    }
  }
}

// Get payment link for quick deposit
export async function getDepositLink(
  amount: number,
  userId: string,
  email: string,
  name: string
): Promise<string | null> {
  const result = await initializePayment(
    amount,
    'USD',
    email,
    name,
    userId,
    `${process.env.NEXTAUTH_URL || 'https://ssbnow.online'}/wallet?deposit=success`
  )
  
  return result.success ? result.paymentLink || null : null
}
