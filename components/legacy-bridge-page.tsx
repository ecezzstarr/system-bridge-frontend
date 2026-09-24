'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import dynamic from 'next/dynamic'
import { HUD } from '@/components/system-switch/HUD'

const SystemSwitchScene = dynamic(() => import('@/components/system-switch/SystemSwitchScene'), { ssr: false })

interface Message { role: 'user' | 'assistant'; content: string }

interface Bridger {
  id: string
  name: string
  username: string | null
}

const SUPPORT_POSITIONS = [
  { id: 'mandate', name: 'Mandate' },
  { id: 'attorney', name: 'Attorney' },
  { id: 'forensic', name: 'Forensic' },
  { id: 'administration', name: 'Administration' },
]

interface SupportMessage { id: string; senderType: 'visitor' | 'staff'; content: string; createdAt: string }

function getFingerprint(code: string) {
  if (typeof window === 'undefined') return 'server'
  const key = `bridge_fp_${code}`
  let fp = localStorage.getItem(key)
  if (!fp) {
    fp = crypto.randomUUID()
    localStorage.setItem(key, fp)
  }
  return fp
}

function getStoredSystemSwitchSession(code: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`bridge_ss_session_${code}`)
}

function storeSystemSwitchSession(code: string, sessionId: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(`bridge_ss_session_${code}`, sessionId)
}

export default function BridgePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string

  // Track prospect ID from URL
  const [prospectId, setProspectId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const pid = urlParams.get('pid')
      if (pid) setProspectId(pid)
    }
  }, [])

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [bridger, setBridger] = useState<Bridger | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  // Spatial State
  const [activeStation, setActiveStation] = useState<string | null>(null)
  const [playerPos, setPlayerPos] = useState<any>(null)
  const [moveDir, setMoveDir] = useState<{ x: number, z: number }>({ x: 0, z: 0 })

  // System Switch entry gate
  const [ssGate, setSsGate] = useState<'na' | 'choose' | 'entered'>('na')
  const [ssExistingState, setSsExistingState] = useState<any>(null)

  // Deposit flow state
  const [understood, setUnderstood] = useState(false)
  const [showDeposit, setShowDeposit] = useState(false)
  const [selectedTier, setSelectedTier] = useState<number | null>(null)
  const [prospectName, setProspectName] = useState('')
  const [prospectPhone, setProspectPhone] = useState('')
  const [txHash, setTxHash] = useState('')
  const [depositId, setDepositId] = useState<string | null>(null)
  const [depositStatus, setDepositStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle')
  const [fileNumber, setFileNumber] = useState<string | null>(null)
  const [submittingDeposit, setSubmittingDeposit] = useState(false)

  // Support panel state
  const [supportOpen, setSupportOpen] = useState(false)
  const [supportPosition, setSupportPosition] = useState<string | null>(null)
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([])
  const [supportInput, setSupportInput] = useState('')
  const [supportSending, setSupportSending] = useState(false)
  const [supportLoading, setSupportLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/bridge/${code}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success) {
          setNotFound(true)
        } else {
          setMessages([{ role: 'assistant', content: data.welcomeMessage }])
          setBridger(data.bridger || null)

          // Check for existing session
          const storedSessionId = getStoredSystemSwitchSession(code)
          if (storedSessionId) {
            setSessionId(storedSessionId)
            setDepositId(storedSessionId)
            setDepositStatus('pending')
            setSsGate('entered')
          }
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [code])

  // Poll for admin approval
  useEffect(() => {
    if (!depositId || depositStatus !== 'pending') return
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/bridge/${code}/deposit/${depositId}`)
        const data = await res.json()
        if (data.success && data.status !== 'pending') {
          setDepositStatus(data.status)
          if (data.status === 'approved' && data.fileNumber) {
            setFileNumber(data.fileNumber)
          }
        }
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [depositId, depositStatus, code])

  const sendMessage = async () => {
    if (!input.trim() || sending) return
    const userMessage = input.trim()
    setInput('')
    const nextMessages = [...messages, { role: 'user' as const, content: userMessage }]
    setMessages(nextMessages)
    setSending(true)

    try {
      const res = await fetch(`/api/bridge/${code}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          visitorFingerprint: getFingerprint(code),
          prospectId,
          messages: nextMessages,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
        if (!sessionId) setSessionId(data.sessionId)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection hiccup — try again?' }])
    }
    setSending(false)
  }

  const handleSubmitDeposit = async () => {
    if (!selectedTier || !prospectName.trim() || !prospectPhone.trim() || !txHash.trim()) return
    setSubmittingDeposit(true)
    try {
      const res = await fetch(`/api/bridge/${code}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          prospectId,
          name: prospectName.trim(),
          phone: prospectPhone.trim(),
          amountFlameCoin: selectedTier,
          tierTrx: selectedTier, // legacy API compatibility
          txHash: txHash.trim(),
        }),
      })
      const data = await res.json()
      if (data.success) {
        setDepositId(data.depositId)
        setDepositStatus('pending')
        setSsGate('entered')
        storeSystemSwitchSession(code, data.depositId)
      }
    } catch {}
    setSubmittingDeposit(false)
  }

  const handleGoToRegister = () => {
    router.push(`/client/register?fileNumber=${encodeURIComponent(fileNumber || '')}`)
  }

  const handleStartFresh = () => {
    localStorage.removeItem(`bridge_ss_session_${code}`)
    setSsExistingState(null)
    setSsGate('na')
  }

  const handleContinue = () => {
    setSsGate('entered')
  }

  const fetchSupportMessages = async (position: string, sid?: string) => {
    const activeSessionId = sid || sessionId
    if (!activeSessionId) return
    setSupportLoading(true)
    try {
      const res = await fetch(`/api/bridge/${code}/support?sessionId=${activeSessionId}&position=${position}`)
      const data = await res.json()
      if (data.success) setSupportMessages(data.messages)
    } catch {}
    setSupportLoading(false)
  }

  const ensureSession = async (): Promise<string | null> => {
    if (sessionId) return sessionId
    try {
      const res = await fetch(`/api/bridge/${code}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: null,
          visitorFingerprint: getFingerprint(code),
          prospectId,
          messages: [{ role: 'user', content: '(started a conversation)' }],
        }),
      })
      const data = await res.json()
      if (data.success && data.sessionId) {
        setSessionId(data.sessionId)
        return data.sessionId
      }
    } catch {}
    return null
  }

  const handleOpenSupport = async (positionId: string) => {
    setSupportPosition(positionId)
    setSupportOpen(true)
    const sid = await ensureSession()
    if (sid) fetchSupportMessages(positionId, sid)
  }

  const handleSendSupportMessage = async () => {
    if (!supportInput.trim() || !supportPosition || supportSending) return
    const sid = await ensureSession()
    if (!sid) return
    const content = supportInput.trim()
    setSupportInput('')
    setSupportSending(true)
    try {
      const res = await fetch(`/api/bridge/${code}/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, position: supportPosition, content }),
      })
      const data = await res.json()
      if (data.success) setSupportMessages(prev => [...prev, data.message])
    } catch {}
    setSupportSending(false)
  }

  useEffect(() => {
    if (!supportOpen || !supportPosition) return
    const interval = setInterval(() => fetchSupportMessages(supportPosition), 5000)
    return () => clearInterval(interval)
  }, [supportOpen, supportPosition])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#08090f]">
        <Loader2 className="h-8 w-8 animate-spin text-[#e8b93f]" />
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-[#08090f]">
        <p className="text-white/40">This link isn't active right now.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-[#08090f] overflow-hidden">
      <div className="fixed inset-0 z-0">
        <SystemSwitchScene
          activeStation={activeStation}
          onStationChange={setActiveStation}
          onPlayerMove={setPlayerPos}
          externalDir={moveDir}
        />
      </div>

      <HUD
        activeStation={activeStation}
        fileNumber={fileNumber}
        bridger={bridger}
        messages={messages}
        input={input}
        setInput={setInput}
        onSendMessage={sendMessage}
        sending={sending}
        depositFlow={{
          isOpen: showDeposit,
          status: depositStatus,
          tier: selectedTier,
          setTier: setSelectedTier,
          name: prospectName,
          setName: setProspectName,
          phone: prospectPhone,
          setPhone: setProspectPhone,
          txHash: txHash,
          setTxHash: setTxHash,
          onSubmit: handleSubmitDeposit,
          submitting: submittingDeposit,
          onConfirmUnderstanding: () => setShowDeposit(!showDeposit),
          understood: understood
        }}
        support={{
          isOpen: supportOpen,
          setOpen: setSupportOpen,
          messages: supportMessages,
          input: supportInput,
          setInput: setSupportInput,
          onSend: handleSendSupportMessage,
          sending: supportSending,
          loading: supportLoading,
          position: supportPosition,
          setPosition: setSupportPosition,
          onOpenSupport: handleOpenSupport
        }}
        onGoToRegister={handleGoToRegister}
      />
    </div>
  )
}
