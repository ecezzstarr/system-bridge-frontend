import { ensureClientFileFolderSchema } from '@/lib/client-file-folder'
import { ensureClientWorkshopSchema } from '@/lib/client-system-workshop'
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

  return { folder, workshop, client, customerDoor }
}
