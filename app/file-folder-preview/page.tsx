import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ProFileFolderPreview } from '@/components/public/pro-file-folder-preview'

export default function FileFolderPreviewPage() {
  return (
    <main className="min-h-screen bg-[#020711] px-3 py-4 text-white sm:px-5 sm:py-6" data-pro-file-folder-public-preview-page="true">
      <div className="mx-auto max-w-7xl">
        <Link href="/" className="mb-4 inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[.16em] text-slate-500 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Return to WEAVE
        </Link>
        <ProFileFolderPreview standalone />
      </div>
    </main>
  )
}
