import { redirect } from 'next/navigation'

export default function LegacyAdminClientMessagesRedirect(){
  redirect('/communications?tab=clients')
}
