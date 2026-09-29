import { redirect } from 'next/navigation'

export default function LegacyAdminHubRedirect(){
  redirect('/communications')
}
