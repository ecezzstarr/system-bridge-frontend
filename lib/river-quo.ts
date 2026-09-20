// Reserved integration boundary for River's Quo delivery layer.
//
// Quo is connected to the workspace, but no Quo inbox/phone number is
// currently configured. Keep provider delivery behind this boundary so
// River's invitation and conversation logic does not depend on a live
// sending number.

export type RiverSmsDelivery = {
  recipient: string
  message: string
}

export type RiverSmsDeliveryResult =
  | { sent: true; provider: 'quo'; activityId?: string }
  | { sent: false; provider: 'quo'; reason: 'no_inbox_configured' }

/**
 * Delivery remains disabled until a Quo inbox is configured.
 * Do not silently fall back to a different sender or fabricate delivery.
 */
export async function deliverRiverSms(
  _delivery: RiverSmsDelivery,
): Promise<RiverSmsDeliveryResult> {
  return {
    sent: false,
    provider: 'quo',
    reason: 'no_inbox_configured',
  }
}
