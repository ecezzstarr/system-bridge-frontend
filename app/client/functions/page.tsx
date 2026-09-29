import { redirect } from 'next/navigation'

export default function LegacyOperatingRoomRedirect(){
  redirect('/client/dashboard')
}
