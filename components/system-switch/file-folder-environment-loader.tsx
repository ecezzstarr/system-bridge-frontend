'use client'

// The single WEAVE environment transit gate supplies the three Client lessons,
// the background artwork, readiness check, and reader-controlled Enter action.
// This nested Client request contributes only a pending signal to that gate.
// It must never create a second full-screen loader.
export function FileFolderEnvironmentLoader() {
  return (
    <div
      data-environment-pending="true"
      data-file-folder-loader="shared-gate-only"
      className="min-h-[100svh] w-full bg-transparent"
      role="status"
      aria-label="Preparing your Client File Folder operating world"
    />
  )
}
