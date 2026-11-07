import 'server-only'
import {resolveFileFolderAppearance,FILE_FOLDER_PALETTES} from '@/lib/file-folder-world-presets'
import {resolveVerifiedClientFileFolderTier} from '@/lib/client-file-folder-tier'
import {getPublishedFileFolderRelease} from '@/lib/file-folder-world-release'

/** Resolve a verified Client's purchased world, never a caller-selected theme. */
export async function getClientKingdomIdentity(sql:any,clientId:string){
  const [owner]=await sql`
    SELECT u.id,u.name,u.business_name,u.file_number
    FROM users u
    JOIN client_file_folders f ON f.client_id=u.id AND f.file_number=u.file_number AND f.status='active'
    WHERE u.id=${clientId}::uuid AND u.role='client' AND COALESCE(u.is_active,true)=true
    LIMIT 1
  `
  if(!owner)return null
  const resolvedTier=await resolveVerifiedClientFileFolderTier(sql,{
    clientId:String(owner.id),fileNumber:String(owner.file_number),
  })
  const release=await getPublishedFileFolderRelease()
  const appearance=resolveFileFolderAppearance(resolvedTier,release?.config)
  return {
    tier:resolvedTier,
    theme:appearance.theme,
    palette:FILE_FOLDER_PALETTES[appearance.theme],
    clientName:String(owner.name||'Client'),
    businessName:String(owner.business_name||owner.name||'Client Kingdom'),
  }
}
