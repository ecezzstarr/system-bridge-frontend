import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { NextResponse } from 'next/server'

export async function requireWorkshopAuthorization() {
  const session = await getServerSession(authOptions)
  
  if (!session || session.user.role !== 'admin') {
    return {
      authorized: false,
      response: NextResponse.json(
        { message: 'Unauthorized: Workshop Admin access required' },
        { status: 401 }
      ),
      session: null
    }
  }

  return {
    authorized: true,
    response: null,
    session
  }
}
