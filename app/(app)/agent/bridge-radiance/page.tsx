import { redirect } from 'next/navigation'

export default function LegacyAgentBridgeRadianceRedirect(){
  redirect('/communications?tab=bridgers')
}
