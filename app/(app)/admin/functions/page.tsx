import { redirect } from 'next/navigation'

export default function LegacyOperatingRoomRedirect(){
  redirect('/admin/dashboard')
}
