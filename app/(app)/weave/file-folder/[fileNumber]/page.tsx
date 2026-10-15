import { redirect } from 'next/navigation'

// Historical route marker for the retired support path: redirect('/event').
// The active route now crosses System Switch first so Flame Event remains
// inside the File Folder boundary.
export default function RetiredPrivateFileFolderSupportRoute(){
  redirect('/system-switch')
}
