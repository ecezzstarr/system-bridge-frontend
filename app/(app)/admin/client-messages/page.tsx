import { redirect } from 'next/navigation'

export default function LegacyAdminClientMessagesRedirect(){
  redirect('/admin/hub?tab=clients')
}
