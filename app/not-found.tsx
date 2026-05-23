'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 flex items-center justify-center p-4">
      <div className="text-center max-w-md w-full">
        <div className="mb-6">
          <h1 className="text-6xl sm:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4">
            404
          </h1>
          <h2 className="text-xl sm:text-2xl font-semibold text-white mb-2">
            Page Not Found
          </h2>
          <p className="text-sm sm:text-base text-slate-400">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 justify-center">
          <Link href="/" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto gap-2 bg-cyan-500 hover:bg-cyan-600 text-black font-semibold">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </Link>
          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="w-full sm:w-auto gap-2 border-slate-600 hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  )
}
