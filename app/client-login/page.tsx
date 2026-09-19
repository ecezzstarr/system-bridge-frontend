import { redirect } from 'next/navigation'

export default function OldClientLoginRedirect() {
  redirect('/client/login')
}
