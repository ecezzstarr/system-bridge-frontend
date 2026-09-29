import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { WORLD_RULES } from '@/lib/world/constants'
import { getBridgersNeedingAttention, autoDeductContinuance } from '@/lib/bridger-subscription'

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { dueForReminder, dueForDeduction } = await getBridgersNeedingAttention()
  const results = { reminded: 0, autoRenewed: 0, alreadyCurrent: 0, insufficient: 0, errors: 0 }

  for (const bridger of dueForReminder) {
    try {
      const daysLeft = Math.ceil((new Date(bridger.subscription_expiry).getTime() - Date.now()) / 86400000)
      await sql`
        INSERT INTO notifications (user_id, type, title, content, link)
        VALUES (${bridger.id}::uuid, 'subscription',
          ${'Your continuance renews in ' + daysLeft + ' day' + (daysLeft === 1 ? '' : 's')},
          ${'Your ₦' + WORLD_RULES.BRIDGER_CONTINUANCE_NGN.toLocaleString() + ' continuance will renew automatically from your Flame Coin wallet. Keep enough balance available.'},
          '/wallet/deposit-withdraw')
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
      if (result.success && 'renewed' in result && result.renewed) {
        results.autoRenewed++
      } else if (result.success) {
        results.alreadyCurrent++
      } else if ('reason' in result && result.reason === 'insufficient_balance') {
        results.insufficient++
        await sql`
          INSERT INTO notifications (user_id, type, title, content, link)
          VALUES (${bridger.id}::uuid, 'subscription', 'Continuance needs wallet funding',
            ${'Automatic renewal needs ' + Number(result.requiredFlameCoin || 0).toLocaleString() + ' Flame Coin. Your current available balance is ' + Number(result.availableFlameCoin || 0).toLocaleString() + ' Flame Coin.'},
            '/wallet/deposit-withdraw')
        `
      } else {
        results.errors++
        console.error('Continuance renewal deferred for', bridger.id, 'reason' in result ? result.reason : 'unknown')
      }
    } catch (e) {
      console.error('Auto-deduct failed for', bridger.id, e)
      results.errors++
    }
  }

  return NextResponse.json({ success: true, results })
}
