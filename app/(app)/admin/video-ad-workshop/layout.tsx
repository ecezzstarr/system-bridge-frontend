import type { ReactNode } from 'react'
import { VideoAdStudioCommerce } from '@/components/admin/video-ad-studio-commerce'
import { VideoAdStudioMovement } from '@/components/admin/video-ad-studio-movement'

export default function VideoAdStudioAdministrationLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <VideoAdStudioCommerce />
      {children}
      <VideoAdStudioMovement />
    </>
  )
}
