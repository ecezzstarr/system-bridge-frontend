'use client'

import { MessageCircle, Wallet } from 'lucide-react'

interface ExternalAppsNavProps {
  userRole: 'admin' | 'agent' | 'bridger' | 'client'
  showBase?: boolean // For client, only show during withdraw
}

// WhatsApp support numbers for different departments
export const SUPPORT_NUMBERS = {
  mandate: '447853187363',
  legal: '447832387522',
  forensic: '12268011782',
  admin: '17829072104',
} as const

// WhatsApp Business deep link
const WHATSAPP_BUSINESS_URL = 'https://api.whatsapp.com/send?phone='

// Coinbase Wallet / Base deep link
const COINBASE_WALLET_URL = 'https://go.cb-w.com/dapp?cb_url='
const BASE_APP_STORE = 'https://play.google.com/store/apps/details?id=org.toshi'

export function openWhatsAppWithNumber(phoneNumber: string, message?: string) {
  const url = message 
    ? `${WHATSAPP_BUSINESS_URL}${phoneNumber}&text=${encodeURIComponent(message)}`
    : `${WHATSAPP_BUSINESS_URL}${phoneNumber}`
  window.open(url, '_blank')
}

export function ExternalAppsNav({ userRole, showBase = false }: ExternalAppsNavProps) {
  const canSeeBase = userRole === 'admin' || userRole === 'bridger' || showBase
  
  const openWhatsAppBusiness = () => {
    // Try to open WhatsApp Business app directly
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      window.location.href = 'whatsapp://send'
    } else {
      window.open('https://web.whatsapp.com/', '_blank')
    }
  }

  const openBase = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      // Try to open Coinbase Wallet app
      window.location.href = 'cbwallet://dapp'
      // Fallback to app store after delay
      setTimeout(() => {
        window.location.href = BASE_APP_STORE
      }, 2000)
    } else {
      window.open('https://www.coinbase.com/wallet', '_blank')
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* WhatsApp Business - All users */}
      <button
        onClick={openWhatsAppBusiness}
        className="flex items-center gap-2 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg transition-all"
        title="WhatsApp Business"
      >
        <svg className="h-5 w-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        <span className="text-sm font-medium text-green-300 hidden sm:inline">WhatsApp</span>
      </button>

      {/* Base / Coinbase Wallet - Admin & Bridger only (or during withdraw for client) */}
      {canSeeBase && (
        <button
          onClick={openBase}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg transition-all"
          title="Base / Coinbase Wallet"
        >
          <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.374 0 12s5.374 12 12 12 12-5.374 12-12S18.626 0 12 0zm0 21.6c-5.298 0-9.6-4.302-9.6-9.6S6.702 2.4 12 2.4s9.6 4.302 9.6 9.6-4.302 9.6-9.6 9.6zm0-16.8c-3.978 0-7.2 3.222-7.2 7.2s3.222 7.2 7.2 7.2 7.2-3.222 7.2-7.2-3.222-7.2-7.2-7.2zm3.6 7.8h-3v3h-1.2v-3h-3v-1.2h3v-3h1.2v3h3v1.2z"/>
          </svg>
          <span className="text-sm font-medium text-blue-300 hidden sm:inline">Base</span>
        </button>
      )}
    </div>
  )
}

// Standalone buttons for embedding in dashboards
export function WhatsAppButton({ className = '' }: { className?: string }) {
  const openWhatsAppBusiness = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      window.location.href = 'whatsapp://send'
    } else {
      window.open('https://web.whatsapp.com/', '_blank')
    }
  }

  return (
    <button
      onClick={openWhatsAppBusiness}
      className={`group relative cursor-pointer ${className}`}
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-4 hover:border-green-500/50 transition">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">WhatsApp</p>
            <p className="text-xs text-slate-400">Contact Support</p>
          </div>
        </div>
      </div>
    </button>
  )
}

export function BaseButton({ className = '' }: { className?: string }) {
  const openBase = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile) {
      window.location.href = 'cbwallet://dapp'
      setTimeout(() => {
        window.location.href = BASE_APP_STORE
      }, 2000)
    } else {
      window.open('https://www.coinbase.com/wallet', '_blank')
    }
  }

  return (
    <button
      onClick={openBase}
      className={`group relative cursor-pointer ${className}`}
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl opacity-20 blur group-hover:opacity-40 transition"></div>
      <div className="relative bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl p-4 hover:border-blue-500/50 transition">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.374 0 0 5.374 0 12s5.374 12 12 12 12-5.374 12-12S18.626 0 12 0zm0 21.6c-5.298 0-9.6-4.302-9.6-9.6S6.702 2.4 12 2.4s9.6 4.302 9.6 9.6-4.302 9.6-9.6 9.6zm0-16.8c-3.978 0-7.2 3.222-7.2 7.2s3.222 7.2 7.2 7.2 7.2-3.222 7.2-7.2-3.222-7.2-7.2-7.2zm3.6 7.8h-3v3h-1.2v-3h-3v-1.2h3v-3h1.2v3h3v1.2z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Base</p>
            <p className="text-xs text-slate-400">Coinbase Wallet</p>
          </div>
        </div>
      </div>
    </button>
  )
}
