import { redirect } from 'next/navigation'

export default async function LegacyCompanyPositionChat({
  params,
}: {
  params: Promise<{ position: string }>
}) {
  const { position } = await params
  redirect('/company-chat?position=' + encodeURIComponent(position))
}
