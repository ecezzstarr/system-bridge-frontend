import { NextRequest, NextResponse } from 'next/server'
import { updateAdminCredentials } from '@/lib/mock-client-db'

export async function POST(request: NextRequest) {
  try {
    const { token, newName, newPassword } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify it's the admin token (simplified - in production use real JWT)
    if (!token.includes('client_admin')) {
      return NextResponse.json(
        { error: 'Only admin can update settings' },
        { status: 403 }
      )
    }

    // Update admin credentials
    const updated = updateAdminCredentials(newName, newPassword)

    return NextResponse.json({
      success: true,
      admin: {
        name: updated.name,
        email: updated.email,
        role: updated.role,
        company_wallet: updated.company_wallet,
      },
    })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
