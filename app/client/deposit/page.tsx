import { redirect } from 'next/navigation'

export default function LegacyClientWalletPage() {
  redirect('/wallet/deposit-withdraw')
}
