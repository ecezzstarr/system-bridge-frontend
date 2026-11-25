'use client'

// File Folder owns its actual pending state without a full-screen company cover.
export function FileFolderEnvironmentLoader() {
  return (
    <div
      data-environment-pending="true"
      data-file-folder-loader="local-status"
      className="flex w-full items-center justify-center px-4 py-8 text-sm"
      role="status"
      aria-live="polite"
    >
      Preparing your Client File Folder…
    </div>
  )
}
