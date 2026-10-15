import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { provisionPurchasedFileFolderCustomerDoor } from '@/lib/client-customer-door-provisioning'

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

  const clientName = String(params.clientName || client.name || 'Client').trim().slice(0, 255) || 'Client'

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
      'pending_personalization',
      'active',
      NOW()
    )
    ON CONFLICT (file_number) DO UPDATE SET
      client_id=${clientId}::uuid,
      client_name=COALESCE(NULLIF(client_file_folders.client_name,''), EXCLUDED.client_name),
      workshop_type=CASE
        WHEN client_file_folders.workshop_type='formation' THEN 'pending_personalization'
        ELSE client_file_folders.workshop_type
      END,
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

  const customerDoor = await provisionPurchasedFileFolderCustomerDoor({
    sql,
    clientId,
    fileNumber,
    clientName,
  })

  return { folder, client, customerDoor }
}
