'use client'

const openTikTok = () => {
  window.location.href = 'snssdk1233://'

  setTimeout(() => {
    window.location.href = 'https://www.tiktok.com'
  }, 800)
}

const openWhatsApp = () => {
  window.location.href = 'whatsapp://'

  setTimeout(() => {
    window.location.href = 'https://www.whatsapp.com/download'
  }, 800)
}

export default function LoungePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-xl w-full space-y-8">

        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold">
            Lounge
          </h1>

          <p className="text-muted-foreground">
            Choose the field you wish to enter.
          </p>
        </div>

        <div className="grid gap-6">

          <button
            onClick={openTikTok}
            className="w-full border rounded-xl p-6 text-left hover:opacity-80 transition"
          >
            <h2 className="text-2xl font-semibold">
              Public Lounge
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Open TikTok
            </p>
          </button>

          <button
            onClick={openWhatsApp}
            className="w-full border rounded-xl p-6 text-left hover:opacity-80 transition"
          >
            <h2 className="text-2xl font-semibold">
              Private Lounge
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              Open WhatsApp
            </p>
          </button>

        </div>

        <div className="text-center text-xs text-muted-foreground">
          Weave of Presence · System Switch · Bridge · Radiance
        </div>

      </div>
    </div>
  )
}
