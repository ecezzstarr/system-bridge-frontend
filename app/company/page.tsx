import type { Metadata } from 'next'
import Link from 'next/link'
import { WEAVE_COMPANY } from '@/lib/company-profile'

export const metadata: Metadata = {
  title: 'Company Registration | Weave of Presence',
  description: `${WEAVE_COMPANY.legalName} — CAC RC ${WEAVE_COMPANY.registrationNumber}, incorporated ${WEAVE_COMPANY.incorporationDateLabel}.`,
  alternates: { canonical: '/company' },
}

export default function CompanyPage() {
  const details = [
    ['Registered company name', WEAVE_COMPANY.legalName],
    ['RC number', WEAVE_COMPANY.registrationNumber],
    ['Registration authority', WEAVE_COMPANY.registrationAuthority],
    ['Company type', WEAVE_COMPANY.companyType],
    ['Country of incorporation', WEAVE_COMPANY.jurisdiction],
    ['Incorporation date', WEAVE_COMPANY.incorporationDateLabel],
    ['Tax identification number', WEAVE_COMPANY.taxIdentificationNumber],
  ] as const

  return (
    <main className="relative z-10 mx-auto min-h-screen max-w-4xl px-4 py-12 text-slate-100 sm:px-6" data-weave-company-registration>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: WEAVE_COMPANY.brandName,
        legalName: WEAVE_COMPANY.legalName,
        url: WEAVE_COMPANY.website,
        identifier: { '@type': 'PropertyValue', propertyID: 'CAC RC', value: WEAVE_COMPANY.registrationNumber },
        taxID: WEAVE_COMPANY.taxIdentificationNumber,
      }).replace(/</g, '\\u003c') }} />
      <Link href="/" className="inline-flex min-h-11 items-center text-sm font-bold text-amber-200 hover:underline">← Weave home</Link>
      <section className="mt-6 rounded-3xl border border-amber-200/30 bg-slate-950/95 p-6 shadow-xl sm:p-10">
        <p className="text-sm font-bold uppercase tracking-widest text-amber-200">Official company information</p>
        <h1 className="mt-4 break-words text-3xl font-black leading-tight sm:text-4xl">{WEAVE_COMPANY.legalName}</h1>
        <p className="mt-4 leading-7 text-slate-200">Weave connects people, work and business systems across borders through Stability, Hope, Dream Lovely and Administrations.</p>
        <dl className="mt-8 divide-y divide-white/15">
          {details.map(([label, value]) => (
            <div key={label} className="grid gap-2 py-4 sm:grid-cols-[1fr_2fr] sm:gap-6">
              <dt className="text-sm text-slate-300">{label}</dt>
              <dd className="break-words font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 rounded-2xl border border-amber-200/20 bg-amber-200/5 p-5">
          <h2 className="text-lg font-bold">Check the CAC record</h2>
          <p className="mt-2 text-sm leading-6 text-slate-200">Open the CAC public search and enter RC {WEAVE_COMPANY.registrationNumber} or the registered company name.</p>
          <a href={WEAVE_COMPANY.publicSearchUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-amber-200 px-4 py-2 font-bold text-slate-950 hover:bg-amber-100">Open CAC public search ↗</a>
        </div>

      </section>
    </main>
  )
}
