import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getBridgersNeedingAttention, autoDeductContinuance } from '@/lib/bridger-subscription'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { dueForReminder, dueForDeduction } = await getBridgersNeedingAttention()
  const results = { reminded: 0, autoRenewed: 0, autoSuspendedOrDue: 0, errors: 0 }

  for (const bridger of dueForReminder) {
    try {
      const daysLeft = Math.ceil((new Date(bridger.subscription_expiry).getTime() - Date.now()) / 86400000)
      await sql`
        INSERT INTO notifications (user_id, type, title, content, link)
        VALUES (${bridger.id}::uuid, 'subscription',
          ${'Your continuance renews in ' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's')},
          ${'Your ₦25,000 continuance will renew from your Holding soon. Make sure the balance is there.'},
          '/bridger/dashboard')
      `
      results.reminded++
    } catch (e) {
      console.error('Reminder failed for', bridger.id, e)
      results.errors++
    }
  }

  for (const bridger of dueForDeduction) {
    try {
      const result = await autoDeductContinuance(bridger.id)
      if (result.success) {
        results.autoRenewed++
        await sql`
          INSERT INTO notifications (user_id, type, title, content, link)
          VALUES (${bridger.id}::uuid, 'subscription', 'Continuance renewed',
            'Your continuance was renewed from your Holding.', '/bridger/dashboard')
        `
      } else {
        results.autoSuspendedOrDue++
        await sql`
          INSERT INTO notifications (user_id, type, title, content, link)
          VALUES (${bridger.id}::uuid, 'subscription', 'Continuance interrupted',
            'Your continuance could not renew — the balance in your Holding was not enough. Add to it to keep your presence active.', '/wallet')
        `
      }
    } catch (e) {
      console.error('Auto-deduct failed for', bridger.id, e)
      results.errors++
    }
  }

  return NextResponse.json({ success: true, results })
}
