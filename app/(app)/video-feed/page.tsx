import { redirect } from 'next/navigation'

export default function LegacyStreamRedirect() {
  redirect('/echo')
}
