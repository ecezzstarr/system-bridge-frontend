import type { ReactNode } from 'react'
import { VideoAdStudioCommerce } from '@/components/admin/video-ad-studio-commerce'

export default function VideoAdStudioAdministrationLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <VideoAdStudioCommerce />
      {children}
    </>
  )
}
