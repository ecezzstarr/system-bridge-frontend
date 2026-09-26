"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, Shield, UserCheck, User, Wallet, TrendingUp, FileText, Info, Camera, Loader2 } from "lucide-react"
import { useAuth } from "@/lib/auth-provider"
import { ClientBuildPull } from "@/components/world/client-build-pull"
import {
  AGENT_CONTENT,
  BRIDGER_CONTENT,
  FILE_FOLDER_CONTENT,
  BRIDGE_PLAZA_CONTENT,
  MOVEMENT_CONTENT,
  COMPANY_SUPPORT,
  HOW_WEAVE_WORKS,
  TERMS_SECTIONS,
  CURRENT_TERMS_VERSION,
} from "@/lib/weave-terms"

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

      {/* Role-specific position section */}
      {(isAgent || isBridger) && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-cyan-400 mb-2">
              {isAgent ? AGENT_CONTENT.positionTitle : BRIDGER_CONTENT.positionTitle}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {isAgent ? AGENT_CONTENT.positionSummary : BRIDGER_CONTENT.positionSummary}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Your Role</h3>
            <p className="text-sm text-slate-300">
              {isAgent ? AGENT_CONTENT.role : BRIDGER_CONTENT.role}
            </p>
          </div>

          {isAgent && (
            <>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Earning Movements</h3>
                <ul className="space-y-1.5">
                  {AGENT_CONTENT.earningMovements.map((m, i) => (
                    <li key={i} className="text-sm text-slate-300 flex gap-2">
                      <span className="text-cyan-400 flex-shrink-0">•</span>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" /> Calculations (Loop 1)
                </h3>
                <ul className="space-y-1.5">
                  {AGENT_CONTENT.calculations.map((c, i) => (
                    <li key={i} className="text-sm text-slate-300 flex gap-2">
                      <span className="text-emerald-400 flex-shrink-0">•</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Folder Support Work</h3>
                <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-purple-500 pl-4 py-1 bg-purple-500/5">
                  {AGENT_CONTENT.folderWork}
                </p>
              </div>
            </>
          )}

          {isBridger && (
            <>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Participation</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{BRIDGER_CONTENT.action}</p>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" /> Earnings (Loop 1)
                </h3>
                <ul className="space-y-1.5">
                  {BRIDGER_CONTENT.earnings.map((e, i) => (
                    <li key={i} className="text-sm text-slate-300 flex gap-2">
                      <span className="text-emerald-400 flex-shrink-0">•</span>
                      {e}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Client Connection</h3>
                <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-emerald-500 pl-4 py-1 bg-emerald-500/5">
                  {BRIDGER_CONTENT.relationship}
                </p>
              </div>
            </>
          )}

          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Movement Loop
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-cyan-500 pl-4 py-1 bg-cyan-500/5">
              {isAgent ? AGENT_CONTENT.movement : BRIDGER_CONTENT.movement}
            </p>
          </div>
        </div>
      )}

      {(isAgent || isBridger) && <ClientBuildPull role={isAgent ? "agent" : "bridger"} />}

            {/* Architectural Context */}
      {(isAgent || isBridger) && (
        <div className="space-y-4">
          <CollapsibleSection title={FILE_FOLDER_CONTENT.title}>
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">{FILE_FOLDER_CONTENT.subtitle}</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{FILE_FOLDER_CONTENT.body}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <p className="text-xs text-slate-400 leading-relaxed italic">{FILE_FOLDER_CONTENT.establishment}</p>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={BRIDGE_PLAZA_CONTENT.title}>
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">{BRIDGE_PLAZA_CONTENT.subtitle}</h4>
                <p className="text-sm text-slate-300 leading-relaxed">{BRIDGE_PLAZA_CONTENT.body}</p>
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title={MOVEMENT_CONTENT.title}>
            <div className="space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">{MOVEMENT_CONTENT.body}</p>
              <p className="text-sm font-black text-cyan-400 uppercase tracking-[0.2em]">{MOVEMENT_CONTENT.footer}</p>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Real Company Support">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {COMPANY_SUPPORT.map((support) => (
                <div key={support.name} className="bg-slate-800/40 border border-slate-700/50 p-3 rounded-lg">
                  <p className="text-xs font-bold text-white mb-0.5">{support.name}</p>
                  <p className="text-[10px] text-slate-400">{support.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-4 italic">
              These are not decorative departments. They are functions that can become active around the Client&apos;s movement.
            </p>
          </CollapsibleSection>
        </div>
      )}

      {/* How WEAVE Works */}
      {(isAgent || isBridger) && (
        <CollapsibleSection title="How WEAVE Works">
          <div className="space-y-4">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{HOW_WEAVE_WORKS.summary}</p>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Institutional Flow</h4>
              <p className="text-sm font-bold text-white">{HOW_WEAVE_WORKS.institutionalFlow}</p>
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1">Client Flow</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{HOW_WEAVE_WORKS.clientFlow}</p>
            </div>
          </div>
        </CollapsibleSection>
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
