import { redirect } from 'next/navigation'

export default function LegacyAgentBridgerManagementRedirect(){
  redirect('/communications?tab=bridgers')
}
