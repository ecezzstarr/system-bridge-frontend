import { WORLD_RULES } from '@/lib/world/constants'

export const CLIENT_PUBLIC_DOOR_THRESHOLD_FLAME_COIN =
  WORLD_RULES.FILE_FOLDER_PREMIUM_PRICE_FLAME_COIN / 2

export const CLIENT_BUILD_SPEED_MIN = 0.25
export const CLIENT_BUILD_SPEED_MAX = 4

export type ClientBuildEconomy = {
  fundingKnown: boolean
  grandfathered: boolean
  initialFileFolderFlameCoin: number
  additionalVerifiedFlameCoin: number
  totalParticipationFlameCoin: number
  publicDoorThresholdFlameCoin: number
  requiredToOpenPublicDoorFlameCoin: number
  publicDoorUnlocked: boolean
  buildSpeedMultiplier: number
}

async function tableExists(sql: any, tableName: string) {
  const [row] = await sql`
    SELECT to_regclass(${`public.${tableName}`}) AS table_name
  `
  return Boolean(row?.table_name)
}

function positive(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

export async function getClientBuildEconomy(
  sql: any,
  clientId: string,
  fileNumber: string,
): Promise<ClientBuildEconomy> {
  const [folder] = await sql`
    SELECT
      created_at,
      CASE
        WHEN COALESCE(identity_data->>'amountTrx','') ~ '^[0-9]+(\\.[0-9]+)?$'
          THEN (identity_data->>'amountTrx')::numeric
        ELSE NULL
      END AS identity_amount
    FROM file_folders
    WHERE file_number=${fileNumber}
    LIMIT 1
  `

  let initialAmount = positive(folder?.identity_amount)

  if (await tableExists(sql, 'bridge_deposits')) {
    const [bridgeAmount] = await sql`
      SELECT COALESCE(MAX(tier_trx),0) AS amount
      FROM bridge_deposits
      WHERE file_number=${fileNumber}
        AND status='approved'
    `
    initialAmount = Math.max(initialAmount, positive(bridgeAmount?.amount))
  }

  if (await tableExists(sql, 'file_folder_purchases')) {
    const [purchaseAmount] = await sql`
      SELECT COALESCE(MAX(amount_trx),0) AS amount
      FROM file_folder_purchases
      WHERE (
        file_number=${fileNumber}
        OR client_id=${clientId}::uuid
      )
        AND status IN ('confirmed','approved','paid_pending_folder')
    `
    initialAmount = Math.max(initialAmount, positive(purchaseAmount?.amount))
  }

  // Only verified Client wallet funding after the File Folder was established
  // contributes to later build power. Pending deposits never count.
  const [additional] = await sql`
    SELECT COALESCE(SUM(amount_trx),0) AS amount
    FROM deposits
    WHERE user_id=${clientId}::uuid
      AND status='approved'
      AND COALESCE(created_at,NOW()) >= COALESCE(${folder?.created_at || null}::timestamptz, '-infinity'::timestamptz)
  `

  const additionalVerifiedFlameCoin = positive(additional?.amount)
  const fundingKnown = initialAmount > 0

  // Existing legacy Clients whose original File Folder price cannot be proven are
  // grandfathered so this new progression rule never unexpectedly closes an
  // already-operating Customer Door.
  if (!fundingKnown) {
    return {
      fundingKnown: false,
      grandfathered: true,
      initialFileFolderFlameCoin: 0,
      additionalVerifiedFlameCoin,
      totalParticipationFlameCoin: additionalVerifiedFlameCoin,
      publicDoorThresholdFlameCoin: CLIENT_PUBLIC_DOOR_THRESHOLD_FLAME_COIN,
      requiredToOpenPublicDoorFlameCoin: 0,
      publicDoorUnlocked: true,
      buildSpeedMultiplier: 1,
    }
  }

  const totalParticipationFlameCoin = initialAmount + additionalVerifiedFlameCoin
  const publicDoorUnlocked =
    totalParticipationFlameCoin >= CLIENT_PUBLIC_DOOR_THRESHOLD_FLAME_COIN
  const requiredToOpenPublicDoorFlameCoin = Math.max(
    0,
    CLIENT_PUBLIC_DOOR_THRESHOLD_FLAME_COIN - totalParticipationFlameCoin,
  )

  // Strategy-builder progression:
  // half Premium = 1x, Premium = 2x, 2x Premium = 4x (cap).
  // Very small Standard folders still build, but at a slower floor.
  const buildSpeedMultiplier = Math.min(
    CLIENT_BUILD_SPEED_MAX,
    Math.max(
      CLIENT_BUILD_SPEED_MIN,
      totalParticipationFlameCoin / CLIENT_PUBLIC_DOOR_THRESHOLD_FLAME_COIN,
    ),
  )

  return {
    fundingKnown: true,
    grandfathered: false,
    initialFileFolderFlameCoin: initialAmount,
    additionalVerifiedFlameCoin,
    totalParticipationFlameCoin,
    publicDoorThresholdFlameCoin: CLIENT_PUBLIC_DOOR_THRESHOLD_FLAME_COIN,
    requiredToOpenPublicDoorFlameCoin,
    publicDoorUnlocked,
    buildSpeedMultiplier,
  }
}

export function effectiveBuildMinutes(
  baseHours: number,
  speedMultiplier: number,
) {
  const baseMinutes = Math.max(15, Math.round(Math.max(0.25, baseHours) * 60))
  const effectiveMinutes = Math.max(
    15,
    Math.ceil(baseMinutes / Math.max(CLIENT_BUILD_SPEED_MIN, speedMultiplier)),
  )
  return { baseMinutes, effectiveMinutes }
}
