import { redirect } from 'next/navigation'

export default function LegacyAgentFunctionsRedirect(){
  redirect('/agent/dashboard')
}
