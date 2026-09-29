import { redirect } from 'next/navigation'

export default function LegacyBridgerRouteRedirect(){
  redirect('/bridger/presence')
}
