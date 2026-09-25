import { redirect } from 'next/navigation'

export default function LegacyClientRegisterRedirect() {
  redirect('/client/register')
}
