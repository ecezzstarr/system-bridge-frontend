'use client'

import Link from 'next/link'

export default function LoungePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">

        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold">
            Lounge
          </h1>

          <p className="text-muted-foreground">
            The Lounge is a bridge.
            Choose the field you wish to enter.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">

          <a
            href="https://www.tiktok.com/@ecezzstarr"
            target="_blank"
            rel="noopener noreferrer"
            className="border rounded-xl p-6 hover:opacity-80 transition"
          >
            <h2 className="text-2xl font-semibold">
              Public Lounge
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Community presence, discovery and open bridge.
            </p>

            <div className="mt-6">
              Enter TikTok →
            </div>
          </a>

          <a
            href="https://wa.me/YOUR_NUMBER"
            target="_blank"
            rel="noopener noreferrer"
            className="border rounded-xl p-6 hover:opacity-80 transition"
          >
            <h2 className="text-2xl font-semibold">
              Private Lounge
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Direct continuity and protected conversation.
            </p>

            <div className="mt-6">
              Enter WhatsApp →
            </div>
          </a>

        </div>

        <div className="text-center text-xs text-muted-foreground">
          Weave of Presence · System Switch · Bridge · Radiance
        </div>

      </div>
    </div>
  )
}
