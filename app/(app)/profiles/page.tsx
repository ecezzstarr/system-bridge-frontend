"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Shield, UserCheck, User, FileText, Info, Camera, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-provider"
import { TERMS_SECTIONS, CURRENT_TERMS_VERSION } from "@/lib/weave-terms"
import { ROLE_ACCOUNT_PLACES } from "@/lib/role-account-scope"

function CollapsibleSection({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <span className="text-sm font-black uppercase tracking-wider text-white">{title}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

const getRoleBadge = (role?: string) => {
  switch (role?.toLowerCase()) {
    case "admin":
      return { icon: Shield, color: "text-red-400 bg-red-500/20", label: "Admin" }
    case "agent":
      return { icon: UserCheck, color: "text-cyan-400 bg-cyan-500/20", label: "Agent" }
    case "bridger":
      return { icon: User, color: "text-emerald-400 bg-emerald-500/20", label: "Bridger" }
    default:
      return { icon: User, color: "text-slate-400 bg-slate-500/20", label: "User" }
  }
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('ssb_auth_token')
    fetch('/api/profile/avatar', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
      .then(res => res.json())
      .then(data => { if (data.success) setAvatarUrl(data.avatarUrl) })
      .catch(() => {})
  }, [user])

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const token = localStorage.getItem('ssb_auth_token')
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        setAvatarUrl(data.avatarUrl)
      } else {
        setUploadError(data.error || 'Upload failed')
      }
    } catch {
      setUploadError('Upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!user) return null

  const badge = getRoleBadge(user.role)
  const BadgeIcon = badge.icon
  const isAgent = user.role === "agent"
  const isBridger = user.role === "bridger"

  return (
    <main className="mx-auto w-full max-w-5xl p-3 md:p-6">
      <section className="weave-system-depth rounded-[2rem] border border-sky-300/15 bg-[#030a15]/72 p-4 md:p-6">
      <div className="space-y-6">
      <div className="mb-2">
        <p className="weave-word-presence text-[9px] font-black uppercase tracking-[0.22em] text-sky-300">Presence Record</p>
        <h1 className="mt-1 text-2xl font-black text-white md:text-3xl">Identity, position, movement and institutional context in one record.</h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 p-[2px]">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <span className="text-xl font-black text-white">{user.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-cyan-600 hover:bg-cyan-500 border-2 border-slate-950 flex items-center justify-center transition disabled:opacity-50"
            title="Change profile picture"
          >
            {uploading ? <Loader2 className="h-3 w-3 text-white animate-spin" /> : <Camera className="h-3 w-3 text-white" />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarSelect} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white">{user.name}</h1>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badge.color}`}>
              <BadgeIcon className="h-3 w-3" />
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-slate-500">{user.email}</p>
          {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
        </div>
      </div>
      {/* Role-specific account scope */}
      {(isAgent || isBridger) && (
        <section className="rounded-2xl border border-sky-300/15 bg-slate-900/45 p-5 md:p-6">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-sky-300">
            {isAgent ? 'Agent account' : 'Bridger account'}
          </p>
          <h2 className="mt-2 text-xl font-black text-white">
            {isAgent ? 'Two working places.' : 'Six working places.'}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            {isAgent
              ? 'Agility and commission from Bridger Prospect purchases are the complete Agent operating surface.'
              : 'Bridge AI, Deposit & Withdrawal, Number Bay, Prospect Market, Echo and Presences are the complete Bridger operating surface.'}
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {ROLE_ACCOUNT_PLACES[isAgent ? 'agent' : 'bridger'].map(place => (
              <div key={place.href} className="rounded-xl border border-white/[0.07] bg-black/20 p-3">
                <p className="text-xs font-black text-white">{place.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-slate-500">{place.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}



      {/* Terms & Conditions */}
      {(isAgent || isBridger) && (
        <CollapsibleSection title="Terms & Conditions">
          <div className="space-y-3 mb-4">
            {user.terms_accepted_at ? (
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                Accepted on {new Date(user.terms_accepted_at).toLocaleDateString()} • Version {user.terms_accepted_version ?? CURRENT_TERMS_VERSION}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                <Info className="h-3.5 w-3.5 flex-shrink-0" />
                Not yet accepted
              </div>
            )}
          </div>
          <div className="space-y-3">
            {TERMS_SECTIONS.map((section) => (
              <div key={section.title}>
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileText className="h-3 w-3 text-slate-500" /> {section.title}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed mt-0.5">{section.body}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {!isAgent && !isBridger && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center">
          <p className="text-sm text-slate-500">Profile details are available for Agent and Bridger accounts.</p>
        </div>
      )}
      </div>
      </section>
    </main>
  )
}
