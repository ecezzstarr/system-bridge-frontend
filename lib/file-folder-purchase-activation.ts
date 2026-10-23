import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'
import { provisionPurchasedFileFolderCustomerDoor } from '@/lib/client-customer-door-provisioning'
import { PLUS_FILE_FOLDER, provisionPlusFileFolderSystems } from '@/lib/file-folder-plus'

function normalizedPhone(value: unknown) {
  return String(value || '').replace(/\D/g, '')
}

export async function resolveExistingClientForFileFolderPurchase(sql: any, purchase: any) {
  if (purchase?.client_id) {
    const [client] = await sql`
      SELECT id,name,email,whatsapp_number,file_number
      FROM users
      WHERE id=${String(purchase.client_id)}::uuid
        AND role='client'
        AND COALESCE(is_active,true)=true
      LIMIT 1
    `
    if (client) return client
  }

  const email = String(purchase?.buyer_email || '').trim()
  if (email) {
    const clients = await sql`
      SELECT id,name,email,whatsapp_number,file_number
      FROM users
      WHERE role='client'
        AND COALESCE(is_active,true)=true
        AND lower(email)=lower(${email})
      LIMIT 2
    `
    if (clients.length === 1) return clients[0]
  }

  const phone = normalizedPhone(purchase?.buyer_phone)
  if (phone.length >= 7) {
    const clients = await sql`
      SELECT id,name,email,whatsapp_number,file_number
      FROM users
      WHERE role='client'
        AND COALESCE(is_active,true)=true
        AND regexp_replace(COALESCE(whatsapp_number,''), '[^0-9]', '', 'g')=${phone}
      LIMIT 2
    `
    if (clients.length === 1) return clients[0]
  }

  return null
}

export async function activatePurchasedFileFolderForClient(params: {
  sql: any
  clientId: string
  fileNumber: string
  clientName?: string | null
  purchaseId?: string | null
}) {
  const { sql, clientId, fileNumber, purchaseId } = params
  await ensureClientFileFolderSchema(sql)
  await ensureClientWorkshopSchema(sql)

  const [client] = await sql`
    SELECT id,name,file_number
    FROM users
    WHERE id=${clientId}::uuid
      AND role='client'
      AND COALESCE(is_active,true)=true
    LIMIT 1
  `
  if (!client) throw new Error('File Folder can only be activated for an active Client account')

  const [targetFolder] = await sql`
    SELECT id,client_id,file_number
    FROM client_file_folders
    WHERE file_number=${fileNumber}
    LIMIT 1
  `
  if (targetFolder?.client_id && String(targetFolder.client_id) !== String(clientId)) {
    throw new Error('Issued File Folder is already assigned to another Client')
  }

  const [ownedFolder] = await sql`
    SELECT id,file_number
    FROM client_file_folders
    WHERE client_id=${clientId}::uuid
    LIMIT 1
  `
  if (ownedFolder && String(ownedFolder.file_number) !== String(fileNumber)) {
    throw new Error(`Client already owns File Folder ${ownedFolder.file_number}`)
  }

  if (client.file_number && String(client.file_number) !== String(fileNumber)) {
    throw new Error(`Client account is already attached to File Folder ${client.file_number}`)
  }

  const [workshopByFile] = await sql`
    SELECT id,client_id,file_number
    FROM client_system_workshops
    WHERE file_number=${fileNumber}
    LIMIT 1
  `
  if (workshopByFile?.client_id && String(workshopByFile.client_id) !== String(clientId)) {
    throw new Error('Issued File Folder workshop is already assigned to another Client')
  }

  const clientName = String(params.clientName || client.name || 'Client').trim().slice(0, 255) || 'Client'

  // A verified purchase opens the Client's File Folder at System Switch. The
  // first persistent place is the System Formation Workshop; it is not a
  // finished business template. The Client continues forming real systems from
  // their own movement inside the open File Folder.
  const [workshop] = await sql`
    INSERT INTO client_system_workshops (
      client_id,
      file_number,
      workshop_type,
      title,
      description
    )
    VALUES (
      ${clientId}::uuid,
      ${fileNumber},
      'system_formation',
      'System Formation Workshop',
      ${`${clientName}'s first File Folder workshop for recognizing, forming, building and activating the systems they choose to operate.`}
    )
    ON CONFLICT (client_id) DO UPDATE SET
      file_number=EXCLUDED.file_number,
      updated_at=NOW()
    RETURNING *
  `

  const [folder] = await sql`
    INSERT INTO client_file_folders (
      client_id,
      file_number,
      client_name,
      workshop_type,
      status,
      claimed_at
    )
    VALUES (
      ${clientId}::uuid,
      ${fileNumber},
      ${clientName},
      ${workshop.workshop_type},
      'active',
      NOW()
    )
    ON CONFLICT (file_number) DO UPDATE SET
      client_id=${clientId}::uuid,
      client_name=COALESCE(NULLIF(client_file_folders.client_name,''), EXCLUDED.client_name),
      workshop_type=${workshop.workshop_type},
      status='active',
      claimed_at=COALESCE(client_file_folders.claimed_at,NOW()),
      updated_at=NOW()
    RETURNING *
  `

  await sql`
    UPDATE users
    SET file_number=${fileNumber}
    WHERE id=${clientId}::uuid
      AND role='client'
  `

  // Keep the File Number Engine ownership aligned with the Client environment.
  // Older verified existing-Client flows could bind users.file_number while the
  // FNE row remained pending/unclaimed, which later made the same File Folder
  // look unfinished even though Administration had already issued it.
  const [{ fne_table }] = await sql`
    SELECT to_regclass('public.file_folders')::text AS fne_table
  `
  if (fne_table) {
    const [fneFolder] = await sql`
      SELECT id,client_id,status
      FROM file_folders
      WHERE file_number=${fileNumber}
      LIMIT 1
    `
    if (fneFolder?.client_id && String(fneFolder.client_id) !== String(clientId)) {
      throw new Error('Issued File Number is already registered to another Client')
    }
    if (fneFolder) {
      await sql`
        UPDATE file_folders
        SET
          client_id=${clientId}::uuid,
          status=CASE WHEN status='pending' THEN 'registered' ELSE status END,
          registered_at=CASE WHEN status='pending' THEN COALESCE(registered_at,NOW()) ELSE registered_at END,
          updated_at=NOW()
        WHERE id=${fneFolder.id}::uuid
          AND (client_id IS NULL OR client_id=${clientId}::uuid)
      `
    }
  }

  // Legacy Clients may legitimately own a File Number created before the
  // purchase table existed. Activation must remain idempotent for those Clients
  // rather than crashing while trying to reconcile an optional purchase row.
  const [{ purchase_table }] = await sql`
    SELECT to_regclass('public.file_folder_purchases')::text AS purchase_table
  `
  if (purchase_table) {
    if (purchaseId) {
      await sql`
        UPDATE file_folder_purchases
        SET client_id=${clientId}::uuid
        WHERE id=${purchaseId}::uuid
          AND (client_id IS NULL OR client_id=${clientId}::uuid)
      `
    } else {
      await sql`
        UPDATE file_folder_purchases
        SET client_id=${clientId}::uuid
        WHERE file_number=${fileNumber}
          AND (client_id IS NULL OR client_id=${clientId}::uuid)
      `
    }
  }

  const customerDoor = await provisionPurchasedFileFolderCustomerDoor({
    sql,
    clientId,
    fileNumber,
    clientName,
  })

  // The other tiers retain their timed construction. Plus has an exact TRX
  // price (and a separate USDT reference) and provisions ready systems
  // after the purchase record has been confirmed by Administration.
  let plusDelivery = null
  if (purchase_table) {
    await sql`ALTER TABLE file_folder_purchases ADD COLUMN IF NOT EXISTS amount_usdt numeric(30,8)`
    const [verifiedPlus] = await sql`
      SELECT id FROM file_folder_purchases
      WHERE file_number=${fileNumber}
        AND client_id=${clientId}::uuid
        AND status='confirmed'
        AND file_folder_tier='plus'
        AND ((payment_method='trx' AND amount_trx=${PLUS_FILE_FOLDER.trx})
          OR (payment_method='usdt' AND amount_usdt=${PLUS_FILE_FOLDER.usdt}))
      ORDER BY confirmed_at DESC NULLS LAST
      LIMIT 1
    `
    if (verifiedPlus) {
      plusDelivery = await provisionPlusFileFolderSystems({
        sql, clientId, fileNumber, purchaseId: String(verifiedPlus.id),
      })
    }
  }

  return { folder, workshop, client, customerDoor, plusDelivery }
}
