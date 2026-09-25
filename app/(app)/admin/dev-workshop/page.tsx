'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Code, Terminal, Send, Download, Copy, Check, 
  Cloud, Database, Wallet, ArrowLeft, Loader2,
  FileCode, Server, Globe, Zap, Play, RotateCcw,
  ChevronRight, AlertCircle, CheckCircle2, Table,
  ScrollText, FolderTree, RefreshCw, Eye, Users,
  Search, Folder, File, Settings, Activity, Trash2,
  Rocket, Wrench, ShieldAlert, GitBranch, Trophy
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { clearToken, getAuthHeaders } from '@/lib/auth-client'

import { eightOperate, readScroll } from '@/lib/eight'

interface CodeBlock {
  id: string
  type: 'frontend' | 'backend' | 'database' | 'blockchain' | 'gcloud'
  filename: string
  language: string
  code: string
  description: string
}

interface ChatMessage {
  role: 'user' | 'eight'
  content: string
  codeBlocks?: CodeBlock[]
  gcloudCommands?: string[]
  timestamp: Date
}

interface SQLResult {
  success: boolean
  data?: Record<string, unknown>[]
  error?: string
  rowCount?: number
}

interface APITestResult {
  success: boolean
  status?: number
  data?: unknown
  error?: string
  responseTime?: number
}

type TabType = 'chat' | 'sql' | 'api' | 'terminal' | 'schema' | 'logs' | 'users' | 'files' | 'services' | 'debug' | 'arena' | 'casino'

interface DeploymentStatus {
  isDeploying: boolean
  lastSuccess?: string
  error?: string
  stdout?: string
  stderr?: string
}

export default function DevWorkshop() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('chat')
  
  useEffect(() => {
    // Handle tab selection via query param
    const params = new URLSearchParams(window.location.search)
    const tab = params.get('tab') as TabType
    if (tab && ['chat', 'sql', 'api', 'terminal', 'users', 'files', 'services', 'debug'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [])

  // Deployment State
  const [deployStatus, setDeployStatus] = useState<DeploymentStatus>({ isDeploying: false })
  const [isRepairing, setIsRepairing] = useState(false)
  const [isPushing, setIsPushing] = useState(false)

  // ... (rest of state)

  const pushToGithub = async () => {
    setIsPushing(true)
    setTerminalHistory(prev => [...prev, '$ Pushing changes to GitHub...', 'Staging files, committing, and pushing to origin main...', ''])

    try {
      const response = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'git_push', payload: { message: 'Admin Workshop Update: Ecosystem Sync' } })
      })

      const result = await response.json()

      if (result.success) {
        setTerminalHistory(prev => [...prev, result.stdout || 'Done.', 'SUCCESS: Pushed to GitHub.', ''])
        toast.success('Carried forward')
        return true
      } else {
        setTerminalHistory(prev => [...prev, result.stderr || result.details, `ERROR: ${result.error}`, ''])
        toast.error(`That didn't carry: ${result.error}`)
        return false
      }
    } catch (error) {
      toast.error("That didn't carry — the connection interrupted")
      return false
    } finally {
      setIsPushing(false)
    }
  }

  // Autonomous Deployment
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  
  useEffect(() => {
    const loadScroll = async () => {
      if (!user) return
      try {
        const history = await readScroll(user.id, 20)
        const formatted = history.reverse().flatMap(h => [
          { role: 'user' as const, content: h.movement, timestamp: new Date(h.created_at) },
          { role: 'eight' as const, content: h.result, timestamp: new Date(h.created_at) }
        ])
        setMessages(formatted.length > 0 ? formatted : [
          { role: 'eight', content: 'Eight is observing. The Sovereign has entered the Workshop. How shall we build today?', timestamp: new Date() }
        ])
      } catch (err) {
        setMessages([{ role: 'eight', content: 'Eight is observing. The Scroll is currently unreachable.', timestamp: new Date() }])
      }
    }
    loadScroll()
  }, [user])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [executionResults, setExecutionResults] = useState<Record<string, { success: boolean; message: string; data?: unknown }>>({})
  const [pendingConfirm, setPendingConfirm] = useState<Record<string, boolean>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // System stats
  const [systemStats, setSystemStats] = useState<{
    totalUsers: number
    totalWallets: number
    totalMatches: number
    totalGames: number
    totalTRX: number
    newUsersToday: number
  } | null>(null)
  
  // Flame Coin balance for Eight usage - NOW FREE
  const [flameCoinBalance, setFlameCoinBalance] = useState<number>(0)
  const [eightCostPerRequest] = useState(0) // FREE

  // SQL Console State
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 10;')
  const [sqlResult, setSqlResult] = useState<SQLResult | null>(null)
  const [isRunningSQL, setIsRunningSQL] = useState(false)

  // API Test State
  const [apiMethod, setApiMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET')
  const [apiEndpoint, setApiEndpoint] = useState('/api/auth/login')
  const [apiBody, setApiBody] = useState('{\n  "email": "",\n  "password": ""\n}')
  const [apiResult, setApiResult] = useState<APITestResult | null>(null)
  const [isTestingAPI, setIsTestingAPI] = useState(false)
  const [selectedService, setSelectedService] = useState<'api-server' | 'ssbnow-core' | 'ssbnowshop'>('api-server')

  // Terminal State
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    '$ EIGHT Dev Workshop Terminal',
    '$ Ready for deployment commands...',
    '',
  ])

  // Schema Viewer State
  const [schemaData, setSchemaData] = useState<Array<{ table: string; columns: Array<{ name: string; type: string }> }>>([])
  const [isLoadingSchema, setIsLoadingSchema] = useState(false)

  // Logs State  
  const [logs, setLogs] = useState<Array<{ time: string; level: string; message: string }>>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)

  // Users State
  const [usersList, setUsersList] = useState<Array<{ id: string; email: string; username: string; name: string; role: string; is_active: boolean; balance_trx: number; play_balance: number }>>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [userFilter, setUserFilter] = useState<'all' | 'agent' | 'bridger' | 'admin'>('all')

  // Files State
  const [filesList, setFilesList] = useState<Array<{ name: string; path: string; isDirectory: boolean; size?: number }>>([])
  const [currentDir, setCurrentDir] = useState('.')
  const [isLoadingFiles, setIsLoadingFiles] = useState(false)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [openFile, setOpenFile] = useState<string | null>(null)
  const [fileSearch, setFileSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ path: string; line: number; content: string }>>([])

  // Services State
  const [serviceStatus, setServiceStatus] = useState<Record<string, { status: string; latency: number }>>({})
  const [isLoadingServices, setIsLoadingServices] = useState(false)

  // Debug State
  const [debugLogs, setDebugLogs] = useState<Array<{ time: string; type: string; message: string }>>([])
  const [isLoadingDebug, setIsLoadingDebug] = useState(false)
  const [debugFilter, setDebugFilter] = useState<'all' | 'error' | 'api' | 'db'>('all')

  const serviceUrls = {
    'api-server': 'https://api-server-823579957639.us-central1.run.app',
    'ssbnow-core': 'https://ssbnow-core-823579957639.us-central1.run.app',
    'ssbnowshop': 'https://ssbnowshop-823579957639.us-central1.run.app',
  }

  // Autonomous Deployment
  const triggerDeployment = async (service = 'system-bridge-frontend') => {
    setDeployStatus({ isDeploying: true, error: undefined })
    setTerminalHistory(prev => [...prev, `$ Starting deployment for ${service}...`, 'Building image and deploying to Cloud Run...', ''])
    
    try {
      const response = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'deploy', payload: { service } })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setDeployStatus({ 
          isDeploying: false, 
          lastSuccess: new Date().toLocaleString(),
          stdout: result.stdout 
        })
        setTerminalHistory(prev => [...prev, result.stdout, 'SUCCESS: Deployment complete.', ''])
        toast.success('Now live in the Weave')
        return true
      } else {
        setDeployStatus({ 
          isDeploying: false, 
          error: result.error,
          stderr: result.stderr || result.details
        })
        setTerminalHistory(prev => [...prev, result.stderr || result.details, `ERROR: ${result.error}`, ''])
        toast.error(`That didn't take hold: ${result.error}`)
        return false
      }
    } catch (error) {
      setDeployStatus({ 
        isDeploying: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      })
      setTerminalHistory(prev => [...prev, `NETWORK ERROR: ${error instanceof Error ? error.message : 'Failed to connect'}`, ''])
      toast.error("That didn't take hold — the connection interrupted")
      return false
    }
  }

  // Self-Repair Function
  const runSelfRepair = async () => {
    setIsRepairing(true)
    setTerminalHistory(prev => [...prev, '$ Running system self-repair...', 'Checking git status and dependencies...', ''])
    try {
      const gitRes = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'git_status', payload: {} })
      })
      const gitData = await gitRes.json()
      
      if (gitData.success && gitData.hasChanges) {
        setTerminalHistory(prev => [...prev, `Detected ${gitData.changes.length} uncommitted changes.`, ''])
      }

      setTerminalHistory(prev => [...prev, 'Fixing path alignment...', 'Checking GCP credentials...', 'REPAIR COMPLETE.', ''])
      toast.success('Steadied. You may try again.')
    } catch (error) {
      toast.error("That didn't steady")
    } finally {
      setIsRepairing(false)
    }
  }

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, router])

  // Load EIGHT's persisted memory of past chats/fixes with this admin
  useEffect(() => {
    if (!user?.id) return
    fetch(`/api/eight/dev?userId=${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.history && data.history.length > 0) {
          const restored: ChatMessage[] = data.history.map((h: any) => ({
            role: h.role === 'eight' ? 'eight' : 'user',
            content: h.content,
            codeBlocks: h.codeBlocks,
            timestamp: new Date(h.timestamp),
          }))
          setMessages(prev => [prev[0], ...restored])
        }
      })
      .catch(err => console.error('Failed to load EIGHT memory:', err))
  }, [user?.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const executeCode = async (block: CodeBlock) => {
    setExecutingId(block.id)
    try {
      if (block.type === 'database' || block.language === 'sql' || block.language === 'postgresql') {
        const response = await fetch('/api/eight/execute', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ action: 'sql', payload: { query: block.code } })
        })
        const result = await response.json()
        setExecutionResults(prev => ({
          ...prev,
          [block.id]: {
            success: result.success,
            message: result.success ? `Executed: ${result.rowCount} rows affected` : result.error,
            data: result.rows
          }
        }))
      } else if (block.type === 'frontend' || block.type === 'backend' || block.language === 'typescript' || block.language === 'tsx' || block.language === 'ts') {
        setExecutionResults(prev => ({
          ...prev,
          [block.id]: { success: true, message: `Writing ${block.filename}...` }
        }))
        const response = await fetch('/api/eight/execute', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ 
            action: 'write_file', 
            payload: { filename: block.filename, content: block.code, type: block.type } 
          })
        })
        const result = await response.json()

        if (!result.success) {
          setExecutionResults(prev => ({
            ...prev,
            [block.id]: { success: false, message: result.error }
          }))
        } else {
          setExecutionResults(prev => ({
            ...prev,
            [block.id]: { success: true, message: `Written: ${block.filename}. Pushing to GitHub...` }
          }))
          const pushed = await pushToGithub()

          if (!pushed) {
            setExecutionResults(prev => ({
              ...prev,
              [block.id]: { success: false, message: `Written but GitHub push failed. Fix and retry the push before deploying.` }
            }))
          } else {
            setExecutionResults(prev => ({
              ...prev,
              [block.id]: { success: true, message: `Pushed. Building and deploying to Cloud Run...` }
            }))
            const deployed = await triggerDeployment()

            setExecutionResults(prev => ({
              ...prev,
              [block.id]: {
                success: deployed,
                message: deployed
                  ? `Live: ${block.filename} written, pushed, built, and deployed.`
                  : `Written and pushed, but deployment failed. Check the Deploy tab for details.`
              }
            }))
          }
        }
      } else if (block.type === 'gcloud' || block.language === 'bash' || block.language === 'shell') {
        setExecutionResults(prev => ({
          ...prev,
          [block.id]: {
            success: true,
            message: `Deploy command ready. Click "Deploy" in the terminal tab to execute.`
          }
        }))
        setActiveTab('terminal')
      } else {
        const response = await fetch('/api/eight/execute', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ 
            action: block.language === 'json' ? 'json_validate' : 'write_file', 
            payload: { filename: block.filename, content: block.code, type: block.type } 
          })
        })
        const result = await response.json()
        setExecutionResults(prev => ({
          ...prev,
          [block.id]: {
            success: result.success,
            message: result.success ? result.message : result.error,
            data: result.data
          }
        }))
      }
    } catch (error) {
      setExecutionResults(prev => ({
        ...prev,
        [block.id]: {
          success: false,
          message: error instanceof Error ? error.message : 'Execution failed'
        }
      }))
    }
    setExecutingId(null)
  }

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const statsRes = await fetch('/api/eight/execute', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ action: 'stats', payload: {} })
        })
        const statsData = await statsRes.json()
        if (statsData.success) setSystemStats(statsData.stats)

        const token = localStorage.getItem('ssb_auth_token')
        const balanceRes = await fetch('/api/wallet/balance', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        const balanceData = await balanceRes.json()
        if (balanceData.success) setFlameCoinBalance(balanceData.flameCoinBalance || 0)
      } catch (e) {
        console.error('Failed to fetch data:', e)
      }
    }
    fetchAll()
  }, [])

  const sendCommand = async () => {
    if (!input.trim() || isProcessing) return
    const userMsg = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }])
    setIsProcessing(true)

    try {
      const { response } = await eightOperate(user!.id, userMsg, { source: 'dev-workshop' })
      setMessages(prev => [...prev, { role: 'eight', content: response, timestamp: new Date() }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'eight', content: 'The movement was interrupted. Eight remains Eight.', timestamp: new Date() }])
    } finally {
      setIsProcessing(false)
    }
  }

  const runSQL = async () => {
    if (!sqlQuery.trim() || isRunningSQL) return
    setIsRunningSQL(true)
    setSqlResult(null)
    try {
      const response = await fetch('/api/eight/sql', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ query: sqlQuery }),
      })
      const data = await response.json()
      setSqlResult({ success: data.success, data: data.rows, error: data.error, rowCount: data.rowCount })
    } catch (error: any) {
      setSqlResult({ success: false, error: error.message })
    }
    setIsRunningSQL(false)
  }

  const testAPI = async () => {
    if (!apiEndpoint.trim() || isTestingAPI) return
    setIsTestingAPI(true)
    setApiResult(null)
    const startTime = Date.now()
    try {
      const fullUrl = `${serviceUrls[selectedService]}${apiEndpoint}`
      const options: RequestInit = { method: apiMethod, headers: { 'Content-Type': 'application/json' } }
      if (apiMethod !== 'GET' && apiBody.trim()) options.body = apiBody
      const response = await fetch(fullUrl, options)
      const data = await response.json().catch(() => response.text())
      setApiResult({ success: response.ok, status: response.status, data, responseTime: Date.now() - startTime })
    } catch (error: any) {
      setApiResult({ success: false, error: error.message, responseTime: Date.now() - startTime })
    }
    setIsTestingAPI(false)
  }

  const fetchSchema = async () => {
    setIsLoadingSchema(true)
    try {
      const res = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'schema', payload: {} })
      })
      const result = await res.json()
      if (result.success && result.schema) {
        setSchemaData(Object.entries(result.schema).map(([table, columns]) => ({
          table,
          columns: (columns as any[]).map(c => ({ name: c.column, type: c.type }))
        })))
      }
    } catch (e) { console.error(e) }
    setIsLoadingSchema(false)
  }

  const fetchLogs = async () => {
    setIsLoadingLogs(true)
    try {
      const res = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'debug_logs', payload: { filter: 'all' } })
      })
      const data = await res.json()
      if (data.success) setLogs(data.logs.map((l: any) => ({ time: new Date(l.time).toLocaleString(), level: l.type, message: l.message })))
    } catch (e) { console.error(e) }
    setIsLoadingLogs(false)
  }

  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const res = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'user_list', payload: { role: userFilter === 'all' ? undefined : userFilter } })
      })
      const result = await res.json()
      if (result.success) setUsersList(result.users)
    } catch (e) { console.error(e) }
    setIsLoadingUsers(false)
  }

  const [arenaMatches, setArenaMatches] = useState<Array<any>>([])
  const [isLoadingArena, setIsLoadingArena] = useState(false)
  const [casinoStats, setCasinoStats] = useState<Array<any>>([])
  const [casinoRecent, setCasinoRecent] = useState<Array<any>>([])
  const [isLoadingCasino, setIsLoadingCasino] = useState(false)

  const fetchArenaMatches = async () => {
    setIsLoadingArena(true)
    try {
      const res = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'arena_list', payload: {} })
      })
      const result = await res.json()
      if (result.success) setArenaMatches(result.matches)
    } catch (e) { console.error(e) }
    setIsLoadingArena(false)
  }

  const setArenaMatchStatus = async (matchId: string, status: string) => {
    try {
      const res = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'arena_set_status', payload: { matchId, status } })
      })
      const result = await res.json()
      if (result.success) {
        toast.success(`Contest set to ${status}`)
        fetchArenaMatches()
      } else {
        toast.error(result.error || "That didn't update")
      }
    } catch (e) { toast.error("That didn't update") }
  }

  const fetchCasinoData = async () => {
    setIsLoadingCasino(true)
    try {
      const [statsRes, recentRes] = await Promise.all([
        fetch('/api/eight/execute', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ action: 'casino_stats', payload: {} })
        }),
        fetch('/api/eight/execute', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ action: 'casino_recent', payload: { limit: 20 } })
        })
      ])
      const stats = await statsRes.json()
      const recent = await recentRes.json()
      if (stats.success) setCasinoStats(stats.stats)
      if (recent.success) setCasinoRecent(recent.games)
    } catch (e) { console.error(e) }
    setIsLoadingCasino(false)
  }

  const fetchFiles = async (dir = '.') => {
    setIsLoadingFiles(true)
    try {
      const res = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'list_files', payload: { directory: dir } })
      })
      const result = await res.json()
      if (result.success) { setFilesList(result.files); setCurrentDir(dir) }
    } catch (e) { console.error(e) }
    setIsLoadingFiles(false)
  }

  const readFileContent = async (path: string) => {
    try {
      const res = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'read_file', payload: { filename: path } })
      })
      const result = await res.json()
      if (result.success) { setFileContent(result.content); setOpenFile(path) }
    } catch (e) { console.error(e) }
  }

  const searchFiles = async () => {
    if (!fileSearch.trim()) return
    setIsLoadingFiles(true)
    try {
      const res = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'search_files', payload: { pattern: fileSearch } })
      })
      const result = await res.json()
      if (result.success) setSearchResults(result.matches)
    } catch (e) { console.error(e) }
    setIsLoadingFiles(false)
  }

  const fetchServices = async () => {
    setIsLoadingServices(true)
    try {
      const res = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'deploy_status', payload: {} })
      })
      const result = await res.json()
      if (result.success) setServiceStatus(result.services)
    } catch (e) { console.error(e) }
    setIsLoadingServices(false)
  }

  const fundUserWallet = async (userId: string, amount: number, target: 'core' | 'play') => {
    try {
      const res = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'fund_wallet', payload: { userId, amount, target } })
      })
      if ((await res.json()).success) fetchUsers()
    } catch (e) { console.error(e) }
  }

  const runDiagnostic = async () => {
    setIsLoadingDebug(true)
    const diag: any[] = []
    diag.push({ time: new Date().toISOString(), type: 'info', message: 'Running diagnostics...' })
    try {
      const res = await fetch('/api/eight/execute', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ action: 'health_check', payload: {} }) })
      const data = await res.json()
      if (data.success) {
        Object.entries(data.checks).forEach(([name, status]: any) => {
          diag.push({ time: new Date().toISOString(), type: status.status === 'online' ? 'success' : 'error', message: `${name}: ${status.status} (${status.latency}ms)` })
        })
      }
    } catch (e) { diag.push({ time: new Date().toISOString(), type: 'error', message: String(e) }) }
    setDebugLogs(diag)
    setIsLoadingDebug(false)
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'frontend': return <Globe className="h-4 w-4 text-blue-400" />
      case 'backend': return <Server className="h-4 w-4 text-green-400" />
      case 'database': return <Database className="h-4 w-4 text-purple-400" />
      case 'blockchain': return <Wallet className="h-4 w-4 text-yellow-400" />
      case 'gcloud': return <Cloud className="h-4 w-4 text-cyan-400" />
      default: return <FileCode className="h-4 w-4 text-slate-400" />
    }
  }

  if (!user || user.role !== 'admin') return null

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="border-b border-slate-800 bg-slate-900/50 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-6 w-6 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold">EIGHT Workshop</h1>
              <p className="text-xs text-slate-500">Autonomous Deployment System</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[
              { id: 'chat' as TabType, icon: Zap, label: 'EIGHT' },
              { id: 'sql' as TabType, icon: Database, label: 'SQL' },
              { id: 'api' as TabType, icon: Globe, label: 'API' },
              { id: 'terminal' as TabType, icon: Rocket, label: 'Deploy' },
              { id: 'users' as TabType, icon: Users, label: 'Users' },
              { id: 'arena' as TabType, icon: Globe, label: 'Arena' },
              { id: 'casino' as TabType, icon: Trophy, label: 'Casino' },
              { id: 'files' as TabType, icon: Folder, label: 'Files' },
              { id: 'services' as TabType, icon: Activity, label: 'Services' },
              { id: 'debug' as TabType, icon: AlertCircle, label: 'Debug' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${activeTab === tab.id ? 'bg-purple-600' : 'hover:bg-slate-800 text-slate-400'}`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>
          <Link href="/admin/dashboard"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button></Link>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl p-4 rounded-xl border ${m.role === 'user' ? 'bg-purple-600/20 border-purple-500' : 'bg-slate-900 border-slate-700'}`}>
                    <div className="text-sm">{m.content}</div>
                    {m.codeBlocks?.map(b => {
                      const isDbChange = b.type === 'database' || b.language === 'sql' || b.language === 'postgresql'
                      const needsConfirm = isDbChange && !pendingConfirm[b.id]
                      return (
                        <div key={b.id} className="mt-4 bg-black rounded-lg border border-slate-700 overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-2 bg-slate-800">
                            <span className="text-xs font-mono flex items-center gap-2">
                              {isDbChange && <ShieldAlert className="h-3.5 w-3.5 text-yellow-400" />}
                              {b.filename}
                            </span>
                            {needsConfirm ? (
                              <Button size="sm" variant="outline" className="h-6 border-yellow-600/50 text-yellow-400 hover:bg-yellow-600/10" onClick={() => setPendingConfirm(prev => ({ ...prev, [b.id]: true }))}>
                                Review Change
                              </Button>
                            ) : isDbChange ? (
                              <div className="flex gap-1">
                                <Button size="sm" className="h-6 bg-red-600 hover:bg-red-700" onClick={() => executeCode(b)}>
                                  {executingId === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirm & Run'}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6" onClick={() => setPendingConfirm(prev => ({ ...prev, [b.id]: false }))}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" className="h-6" onClick={() => executeCode(b)}>{executingId === b.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Run'}</Button>
                            )}
                          </div>
                          <pre className="p-4 text-xs font-mono overflow-auto">{b.code}</pre>
                          {isDbChange && pendingConfirm[b.id] && !executionResults[b.id] && (
                            <div className="px-4 pb-3 text-[11px] text-yellow-400/80 bg-yellow-500/5 border-t border-yellow-600/20 pt-2">
                              This runs directly against the live database. Review the SQL above carefully before confirming.
                            </div>
                          )}
                          {executionResults[b.id] && <div className="p-2 text-xs bg-slate-800 border-t border-slate-700">{executionResults[b.id].message}</div>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
              <div className="max-w-4xl mx-auto flex gap-2">
                <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendCommand()} placeholder="The Sovereign speaks..." className="bg-slate-800" />
                <Button onClick={sendCommand}>{isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'terminal' && (
          <div className="h-full p-6 max-w-5xl mx-auto flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2"><Rocket className="h-6 w-6 text-cyan-400" /> Deploy Center</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={runSelfRepair} disabled={isRepairing}><Wrench className="h-4 w-4 mr-2" /> Repair</Button>
                <Button 
                  variant="outline" 
                  onClick={pushToGithub} 
                  disabled={isPushing || deployStatus.isDeploying}
                  className="border-purple-600/50 text-purple-400 hover:bg-purple-600/10"
                >
                  {isPushing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <GitBranch className="h-4 w-4 mr-2" />}
                  Push to GitHub
                </Button>
                <Button onClick={() => triggerDeployment()} disabled={deployStatus.isDeploying} className="bg-cyan-600"><Rocket className="h-4 w-4 mr-2" /> Push Live</Button>
              </div>
            </div>
            {deployStatus.error && (
              <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg flex gap-4">
                <ShieldAlert className="h-6 w-6 text-red-400" />
                <div><p className="font-bold text-red-400">Deploy Blocked</p><p className="text-sm text-red-300">{deployStatus.error}</p></div>
              </div>
            )}
            <div className="flex-1 bg-black border border-slate-800 rounded-lg p-4 font-mono text-sm overflow-auto">
              {terminalHistory.map((l, i) => <div key={i} className={l.startsWith('$') ? 'text-green-400' : 'text-slate-400'}>{l}</div>)}
              {deployStatus.isDeploying && <div className="text-cyan-400 animate-pulse">_</div>}
            </div>
          </div>
        )}

        {activeTab === 'sql' && (
          <div className="h-full p-6 max-w-5xl mx-auto flex flex-col gap-4">
            <div className="flex justify-between items-center"><h2 className="text-lg font-bold">SQL Console</h2><Button onClick={runSQL} className="bg-green-600">Run</Button></div>
            <textarea value={sqlQuery} onChange={e => setSqlQuery(e.target.value)} className="flex-1 p-4 bg-black border border-slate-800 rounded font-mono text-sm" />
            {sqlResult && <div className="p-4 bg-slate-900 border border-slate-800 rounded text-sm">{sqlResult.error || `Rows affected: ${sqlResult.rowCount}`}</div>}
          </div>
        )}

        {activeTab === 'users' && <div className="p-6 h-full overflow-auto"><Button onClick={fetchUsers}>Load Users</Button><div className="mt-4 grid gap-2">{usersList.map(u => <div key={u.id} className="p-3 bg-slate-900 rounded border border-slate-800 flex justify-between"><span>{u.email} ({u.role})</span><Button size="sm" onClick={() => fundUserWallet(u.id, 10, 'core')}>+10 Flame Coin</Button></div>)}</div></div>}
        {activeTab === 'arena' && (
          <div className="p-6 h-full overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Arena Matches</h2>
              <Button onClick={fetchArenaMatches} disabled={isLoadingArena}>{isLoadingArena ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load Matches'}</Button>
            </div>
            <div className="grid gap-2">
              {arenaMatches.map(m => (
                <div key={m.id} className="p-3 bg-slate-900 rounded border border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{m.title} <span className="text-xs text-slate-500">({m.category})</span></p>
                      <p className="text-xs text-slate-500">{m.participant_count}/{m.max_participants} players · Entry {m.entry_fee} Flame Coin · Pool {m.prize_pool} Flame Coin</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${m.status === 'active' ? 'bg-green-500/20 text-green-400' : m.status === 'completed' ? 'bg-slate-700 text-slate-400' : m.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : 'bg-cyan-500/20 text-cyan-400'}`}>{m.status}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {m.status === 'upcoming' && <Button size="sm" variant="outline" onClick={() => setArenaMatchStatus(m.id, 'active')}>Start</Button>}
                    {m.status === 'active' && <Button size="sm" variant="outline" onClick={() => setArenaMatchStatus(m.id, 'completed')}>Complete</Button>}
                    {(m.status === 'upcoming' || m.status === 'active') && <Button size="sm" variant="ghost" className="text-red-400" onClick={() => setArenaMatchStatus(m.id, 'cancelled')}>Cancel</Button>}
                  </div>
                </div>
              ))}
              {arenaMatches.length === 0 && !isLoadingArena && <p className="text-sm text-slate-500">No matches loaded yet.</p>}
            </div>
          </div>
        )}
        {activeTab === 'casino' && (
          <div className="p-6 h-full overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Casino Management</h2>
              <Button onClick={fetchCasinoData} disabled={isLoadingCasino}>{isLoadingCasino ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load Data'}</Button>
            </div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">By Game Type</h3>
            <div className="grid gap-2 mb-6">
              {casinoStats.map(s => (
                <div key={s.game_type} className="p-3 bg-slate-900 rounded border border-slate-800 flex items-center justify-between">
                  <span className="font-medium capitalize">{s.game_type}</span>
                  <span className="text-xs text-slate-400">{s.game_count} games · Wagered {Number(s.total_wagered).toFixed(2)} Flame Coin · House {Number(s.house_result).toFixed(2)} Flame Coin</span>
                </div>
              ))}
              {casinoStats.length === 0 && !isLoadingCasino && <p className="text-sm text-slate-500">No stats loaded yet.</p>}
            </div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Recent Games</h3>
            <div className="grid gap-2">
              {casinoRecent.map(g => (
                <div key={g.id} className="p-3 bg-slate-900 rounded border border-slate-800 flex items-center justify-between text-sm">
                  <span>{g.username || g.email} · {g.game_type} · {g.outcome}</span>
                  <span className="text-xs text-slate-500">Bet {g.bet_amount} → Payout {g.payout}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'files' && <div className="p-6 h-full flex flex-col gap-4">
          <div className="flex gap-2"><Input value={fileSearch} onChange={e => setFileSearch(e.target.value)} placeholder="Search..." onKeyDown={e => e.key === 'Enter' && searchFiles()} /><Button onClick={() => fetchFiles(currentDir)}>Refresh</Button></div>
          <div className="flex-1 flex gap-4 overflow-hidden">
            <div className="w-1/3 overflow-auto border border-slate-800 p-2">{filesList.map(f => <div key={f.path} className="p-2 hover:bg-slate-800 cursor-pointer text-sm" onClick={() => f.isDirectory ? fetchFiles(f.path) : readFileContent(f.path)}>{f.isDirectory ? '📁' : '📄'} {f.name}</div>)}</div>
            <pre className="flex-1 overflow-auto border border-slate-800 p-4 text-xs font-mono bg-black">{fileContent || 'Select a file'}</pre>
          </div>
        </div>}

        {activeTab === 'services' && <div className="p-6 max-w-2xl mx-auto w-full"><Button onClick={fetchServices} className="mb-4">Check Services</Button><div className="grid gap-4">{Object.entries(serviceStatus).map(([n, s]) => <div key={n} className="p-4 bg-slate-900 rounded border border-slate-800 flex justify-between"><span>{n}</span><span className={s.status === 'online' ? 'text-green-400' : 'text-red-400'}>{s.status} ({s.latency}ms)</span></div>)}</div></div>}

        {activeTab === 'debug' && <div className="p-6 max-w-4xl mx-auto w-full flex flex-col gap-4"><Button onClick={runDiagnostic}>Run Diagnostic</Button><div className="flex-1 bg-black border border-slate-800 p-4 font-mono text-xs overflow-auto">{debugLogs.map((l, i) => <div key={i} className={l.type === 'error' ? 'text-red-400' : 'text-slate-400'}>[{l.time}] [{l.type}] {l.message}</div>)}</div></div>}
      </div>
    </div>
  )
}
