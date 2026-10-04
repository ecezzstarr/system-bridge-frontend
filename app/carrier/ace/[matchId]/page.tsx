import type { Metadata } from 'next'
import { AceCarrierPublic } from '@/components/carrier/ace-carrier-public'
import { getAceCarrierUrl, getPublicAceCarrier } from '@/lib/carrier'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ matchId: string }>
}): Promise<Metadata> {
  const { matchId } = await params
  try {
    const carrier = await getPublicAceCarrier(matchId)
    if (!carrier) {
      return {
        title: 'Carrier Closed · WEAVE',
        description: 'This WEAVE Carrier is not currently open.',
        robots: { index: false, follow: false },
      }
    }
    const description = carrier.message || `${carrier.aceName} is playing ${carrier.title} in Weave Arena.`
    return {
      title: `${carrier.aceName} · ${carrier.title} · WEAVE Carrier`,
      description,
      alternates: { canonical: getAceCarrierUrl(matchId) },
      openGraph: {
        title: `${carrier.aceName} · ${carrier.title}`,
        description,
        type: 'website',
        url: getAceCarrierUrl(matchId),
        siteName: 'WEAVE Carrier',
      },
      twitter: {
        card: 'summary_large_image',
        title: `${carrier.aceName} · ${carrier.title}`,
        description,
      },
      robots: { index: true, follow: true },
    }
  } catch {
    return {
      title: 'WEAVE Carrier',
      description: 'A public movement from WEAVE Arena.',
    }
  }
}

export default async function AceCarrierPage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = await params
  return <AceCarrierPublic matchId={matchId} />
}
