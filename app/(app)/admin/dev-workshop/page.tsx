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
  Search, Folder, File, Settings, Activity, Trash2
} from 'lucide-react'
import Link from 'next/link'

interface CodeBlock {
  id: string
  type: 'frontend' | 'backend' | 'database' | 'blockchain' | 'gcloud'
  filename: string
  language: string
  code: string
  description: string
}

interface EightResponse {
  message: string
  codeBlocks?: CodeBlock[]
  gcloudCommands?: string[]
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

type TabType = 'chat' | 'sql' | 'api' | 'terminal' | 'schema' | 'logs' | 'users' | 'files' | 'services' | 'debug'

export default function DevWorkshop() {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('chat')
  
  // Chat State
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'eight',
      content: `EIGHT Dev Workshop initialized. **FREE UNLIMITED ACCESS**

I can help you code your ecosystem:
- Frontend components (React/Next.js)
- Backend API routes (Cloud Run)
- Database schemas (PostgreSQL)
- Blockchain operations (TRON)

Use the tabs above to:
- SQL: Run queries directly on your database
- API: Test your Cloud Run endpoints
- Terminal: View/copy deployment commands`,
      timestamp: new Date(),
    }
  ])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [executionResults, setExecutionResults] = useState<Record<string, { success: boolean; message: string; data?: unknown }>>({})
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
  
  // TRX balance for Eight usage - NOW FREE
  const [trxBalance, setTrxBalance] = useState<number>(0)
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
    '$ Ready for gcloud commands...',
    '',
  ])

  // Schema Viewer State
  const [schemaData, setSchemaData] = useState<Array<{ table: string; columns: Array<{ name: string; type: string }> }>>([])
  const [isLoadingSchema, setIsLoadingSchema] = useState(false)

  // Logs State  
  const [logs, setLogs] = useState<Array<{ time: string; level: string; message: string }>>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [logsService, setLogsService] = useState<'api-server' | 'ssbnow-core'>('api-server')

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
  const [autoRefresh, setAutoRefresh] = useState(false)

  const serviceUrls = {
    'api-server': 'https://api-server-823579957639.us-central1.run.app',
    'ssbnow-core': 'https://ssbnow-core-823579957639.us-central1.run.app',
    'ssbnowshop': 'https://ssbnowshop-823579957639.us-central1.run.app',
  }

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      router.push('/dashboard')
    }
  }, [user, router])

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

  // Execute code block - Eight can run ALL code
  const executeCode = async (block: CodeBlock) => {
    setExecutingId(block.id)
    
    try {
      if (block.type === 'database' || block.language === 'sql' || block.language === 'postgresql') {
        // Execute SQL directly on Neon
        const response = await fetch('/api/eight/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
        // Write file to project via API
        const response = await fetch('/api/eight/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'write_file', 
            payload: { 
              filename: block.filename, 
              content: block.code,
              type: block.type 
            } 
          })
        })
        const result = await response.json()
        setExecutionResults(prev => ({
          ...prev,
          [block.id]: {
            success: result.success,
            message: result.success ? `Deployed: ${block.filename} written to project` : result.error,
          }
        }))
      } else if (block.type === 'gcloud' || block.language === 'bash' || block.language === 'shell') {
        // Cloud Run deploy commands - show ready status  
        setExecutionResults(prev => ({
          ...prev,
          [block.id]: {
            success: true,
            message: `Deploy command ready. Run in Cloud Shell or local terminal.`
          }
        }))
      } else {
        // Generic execution
        const response = await fetch('/api/eight/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

  // Fetch system stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stats', payload: {} })
      })
      const result = await response.json()
      if (result.success) {
        setSystemStats(result.stats)
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e)
    }
  }

  // Load stats on mount
  useEffect(() => {
    fetchStats()
    // Fetch TRX balance
    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem('auth_token')
        const response = await fetch('/api/wallet/balance', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        const data = await response.json()
        if (data.success) {
          setTrxBalance(data.coreTrx || 0)
        }
      } catch (e) {
        console.error('Failed to fetch balance:', e)
      }
    }
    fetchBalance()
  }, [])

  // EIGHT Chat - Full AI Assistant (FREE)
  const sendCommand = async () => {
    if (!input.trim() || isProcessing) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setIsProcessing(true)

    try {
      const response = await fetch('/api/eight/dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: input,
          userId: user?.id,
          conversationHistory: updatedMessages.map(m => ({
            role: m.role,
            content: m.content
          })),
        }),
      })

      const data = await response.json()

      const eightMessage: ChatMessage = {
        role: 'eight',
        content: data.message,
        codeBlocks: data.codeBlocks,
        gcloudCommands: data.gcloudCommands,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, eightMessage])
    } catch {
      setMessages(prev => [...prev, {
        role: 'eight',
        content: 'Connection error. Please try again.',
        timestamp: new Date(),
      }])
    }

    setIsProcessing(false)
  }

  // SQL Execution
  const runSQL = async () => {
    if (!sqlQuery.trim() || isRunningSQL) return
    setIsRunningSQL(true)
    setSqlResult(null)

    try {
      const response = await fetch('/api/eight/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: sqlQuery }),
      })

      const data = await response.json()
      setSqlResult({
        success: data.success,
        data: data.rows,
        error: data.error,
        rowCount: data.rowCount,
      })
    } catch (error: unknown) {
      setSqlResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to execute query',
      })
    }

    setIsRunningSQL(false)
  }

  // API Testing
  const testAPI = async () => {
    if (!apiEndpoint.trim() || isTestingAPI) return
    setIsTestingAPI(true)
    setApiResult(null)

    const startTime = Date.now()

    try {
      const fullUrl = `${serviceUrls[selectedService]}${apiEndpoint}`
      
      const options: RequestInit = {
        method: apiMethod,
        headers: { 'Content-Type': 'application/json' },
      }

      if (apiMethod !== 'GET' && apiBody.trim()) {
        options.body = apiBody
      }

      const response = await fetch(fullUrl, options)
      const responseTime = Date.now() - startTime
      
      let data
      try {
        data = await response.json()
      } catch {
        data = await response.text()
      }

      setApiResult({
        success: response.ok,
        status: response.status,
        data,
        responseTime,
      })
    } catch (error: unknown) {
      setApiResult({
        success: false,
        error: error instanceof Error ? error.message : 'Request failed',
        responseTime: Date.now() - startTime,
      })
    }

    setIsTestingAPI(false)
  }

  // Fetch database schema
  const fetchSchema = async () => {
    setIsLoadingSchema(true)
    try {
      const response = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'schema', payload: {} })
      })
      const result = await response.json()
      if (result.success && result.schema) {
        const schemaArray = Object.entries(result.schema).map(([table, columns]) => ({
          table,
          columns: (columns as Array<{ column: string; type: string }>).map(c => ({ name: c.column, type: c.type }))
        }))
        setSchemaData(schemaArray)
      }
    } catch (e) {
      console.error('Failed to fetch schema:', e)
    }
    setIsLoadingSchema(false)
  }

  // Fetch system stats
  const fetchLogs = async () => {
    setIsLoadingLogs(true)
    try {
      const response = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stats', payload: {} })
      })
      const result = await response.json()
      if (result.success) {
        setSystemStats(result.stats)
      }
      
      // Also fetch recent activity
      const activityRes = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'sql', 
          payload: { 
            query: `SELECT 'user' as type, created_at, email as detail FROM users ORDER BY created_at DESC LIMIT 5
                    UNION ALL
                    SELECT 'casino' as type, created_at, outcome as detail FROM casino_games ORDER BY created_at DESC LIMIT 5
                    ORDER BY created_at DESC LIMIT 10`
          }
        }),
      })
      const activityData = await activityRes.json()
      if (activityData.success && activityData.rows) {
        setLogs(activityData.rows.map((r: { type: string; created_at: string; detail: string }) => ({
          time: new Date(r.created_at).toLocaleString(),
          level: r.type,
          message: r.detail || 'Activity'
        })))
      }
    } catch (e) {
      console.error('Failed to fetch logs:', e)
    }
    setIsLoadingLogs(false)
  }

  // Fetch users list
  const fetchUsers = async () => {
    setIsLoadingUsers(true)
    try {
      const response = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'user_list', 
          payload: { role: userFilter === 'all' ? undefined : userFilter } 
        })
      })
      const result = await response.json()
      if (result.success) {
        setUsersList(result.users)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
    setIsLoadingUsers(false)
  }

  // Fetch files list
  const fetchFiles = async (dir = '.') => {
    setIsLoadingFiles(true)
    try {
      const response = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'list_files', payload: { directory: dir } })
      })
      const result = await response.json()
      if (result.success) {
        setFilesList(result.files)
        setCurrentDir(dir)
      }
    } catch (error) {
      console.error('Failed to fetch files:', error)
    }
    setIsLoadingFiles(false)
  }

  // Read file content
  const readFileContent = async (path: string) => {
    try {
      const response = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read_file', payload: { filename: path } })
      })
      const result = await response.json()
      if (result.success) {
        setFileContent(result.content)
        setOpenFile(path)
      }
    } catch (error) {
      console.error('Failed to read file:', error)
    }
  }

  // Search files
  const searchFiles = async () => {
    if (!fileSearch.trim()) return
    setIsLoadingFiles(true)
    try {
      const response = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search_files', payload: { pattern: fileSearch } })
      })
      const result = await response.json()
      if (result.success) {
        setSearchResults(result.matches)
      }
    } catch (error) {
      console.error('Failed to search files:', error)
    }
    setIsLoadingFiles(false)
  }

  // Fetch service status
  const fetchServices = async () => {
    setIsLoadingServices(true)
    try {
      const response = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deploy_status', payload: {} })
      })
      const result = await response.json()
      if (result.success) {
        setServiceStatus(result.services)
      }
    } catch (error) {
      console.error('Failed to fetch services:', error)
    }
    setIsLoadingServices(false)
  }

  // Fund user wallet
  const fundUserWallet = async (userId: string, amount: number, target: 'core' | 'play') => {
    try {
      const response = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'fund_wallet', 
          payload: { userId, amount, target } 
        })
      })
      const result = await response.json()
      if (result.success) {
        fetchUsers()
      }
    } catch (error) {
      console.error('Failed to fund wallet:', error)
    }
  }

  // Fetch debug logs from system
  const fetchDebugLogs = async () => {
    setIsLoadingDebug(true)
    try {
      const response = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'debug_logs', payload: { filter: debugFilter } })
      })
      const result = await response.json()
      if (result.success) {
        setDebugLogs(result.logs || [])
      }
    } catch (error) {
      console.error('Failed to fetch debug logs:', error)
      // Fallback to recent activity
      setDebugLogs([
        { time: new Date().toISOString(), type: 'info', message: 'Debug system initialized' },
        { time: new Date().toISOString(), type: 'api', message: 'API endpoints ready' },
        { time: new Date().toISOString(), type: 'db', message: 'Database connected' },
      ])
    }
    setIsLoadingDebug(false)
  }

  // Run system diagnostic
  const runDiagnostic = async () => {
    setIsLoadingDebug(true)
    const diagnostics: Array<{ time: string; type: string; message: string }> = []
    const now = () => new Date().toISOString()

    // Check API endpoints
    diagnostics.push({ time: now(), type: 'info', message: 'Running system diagnostics...' })
    
    try {
      // Check Vercel app
      const vercelRes = await fetch('/api/health', { method: 'GET' }).catch(() => null)
      diagnostics.push({ 
        time: now(), 
        type: vercelRes?.ok ? 'success' : 'error', 
        message: `Vercel App: ${vercelRes?.ok ? 'Online' : 'Offline or no health endpoint'}` 
      })

      // Check database
      const dbRes = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sql', payload: { query: 'SELECT 1 as health' } })
      })
      const dbData = await dbRes.json()
      diagnostics.push({ 
        time: now(), 
        type: dbData.success ? 'success' : 'error', 
        message: `Neon Database: ${dbData.success ? 'Connected' : 'Connection failed'}` 
      })

      // Check Cloud Run services
      for (const [name, url] of Object.entries(serviceUrls)) {
        try {
          const start = Date.now()
          const svcRes = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) }).catch(() => null)
          const latency = Date.now() - start
          diagnostics.push({ 
            time: now(), 
            type: svcRes?.ok ? 'success' : 'warning', 
            message: `${name}: ${svcRes?.ok ? `Online (${latency}ms)` : 'Offline or no response'}` 
          })
        } catch {
          diagnostics.push({ time: now(), type: 'error', message: `${name}: Timeout` })
        }
      }

      // Get stats
      const statsRes = await fetch('/api/eight/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stats', payload: {} })
      })
      const statsData = await statsRes.json()
      if (statsData.success && statsData.stats) {
        diagnostics.push({ time: now(), type: 'info', message: `Total Users: ${statsData.stats.totalUsers}` })
        diagnostics.push({ time: now(), type: 'info', message: `Total TRX: ${statsData.stats.totalTrx}` })
        diagnostics.push({ time: now(), type: 'info', message: `Casino Games: ${statsData.stats.casinoGames}` })
      }

      diagnostics.push({ time: now(), type: 'success', message: 'Diagnostics complete' })
    } catch (error) {
      diagnostics.push({ time: now(), type: 'error', message: `Diagnostic error: ${error}` })
    }

    setDebugLogs(diagnostics)
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

  if (!user || user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(168,85,247,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(168,85,247,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <div className="border-b border-purple-900/50 backdrop-blur-sm bg-slate-900/30 px-6 py-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Zap className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">EIGHT Dev Workshop</h1>
                <p className="text-xs text-purple-300">Code, Execute, Deploy</p>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-1 bg-slate-800/50 p-1 rounded-lg flex-wrap">
              {[
                { id: 'chat' as TabType, icon: Zap, label: 'EIGHT' },
                { id: 'sql' as TabType, icon: Database, label: 'SQL' },
                { id: 'api' as TabType, icon: Globe, label: 'API' },
                { id: 'schema' as TabType, icon: Table, label: 'Schema' },
                { id: 'users' as TabType, icon: Users, label: 'Users' },
                { id: 'files' as TabType, icon: Folder, label: 'Files' },
                { id: 'services' as TabType, icon: Activity, label: 'Services' },
                { id: 'debug' as TabType, icon: AlertCircle, label: 'Debug' },
                { id: 'logs' as TabType, icon: ScrollText, label: 'Activity' },
                { id: 'terminal' as TabType, icon: Terminal, label: 'Deploy' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TRX Balance for Eight */}
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-yellow-400" />
                  <div>
                    <p className="text-xs text-yellow-300">EIGHT Credits</p>
                    <p className="text-lg font-bold text-yellow-400">{trxBalance.toFixed(2)} TRX</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">{eightCostPerRequest} TRX per request</p>
              </div>

              <Link href="/admin/dashboard">
                <Button variant="ghost" size="sm" className="gap-2 text-slate-400">
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* EIGHT Chat Tab */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="max-w-4xl mx-auto space-y-6">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-3xl ${msg.role === 'user' ? 'bg-purple-600/30 border-purple-500/50' : 'bg-slate-800/80 border-slate-700'} border rounded-xl p-4`}>
                        <div className="flex items-center gap-2 mb-2">
                          {msg.role === 'eight' ? (
                            <Zap className="h-4 w-4 text-purple-400" />
                          ) : (
                            <Terminal className="h-4 w-4 text-slate-400" />
                          )}
                          <span className="text-xs text-slate-400">
                            {msg.role === 'eight' ? 'EIGHT' : 'You'} - {msg.timestamp.toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="text-sm text-slate-200 whitespace-pre-wrap">{msg.content}</div>

                        {msg.codeBlocks && msg.codeBlocks.length > 0 && (
                          <div className="mt-4 space-y-4">
                            {msg.codeBlocks.map((block) => (
                              <div key={block.id} className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                                <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                                  <div className="flex items-center gap-2">
                                    {getTypeIcon(block.type)}
                                    <span className="text-sm font-mono text-slate-300">{block.filename}</span>
                                    <span className="text-xs text-slate-500">({block.language})</span>
                                  </div>
                                                  <div className="flex gap-2">
                                                    <Button
                                                      size="sm"
                                                      className="h-7 px-3 bg-green-600 hover:bg-green-700 text-white"
                                                      onClick={() => executeCode(block)}
                                                      disabled={executingId === block.id}
                                                    >
                                                      {executingId === block.id ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                      ) : (
                                                        <>
                                                          <Play className="h-3 w-3 mr-1" />
                                                          {block.type === 'database' || block.language === 'sql' ? 'Run SQL' :
                                                           block.type === 'gcloud' || block.language === 'bash' ? 'Deploy' :
                                                           'Deploy'}
                                                        </>
                                                      )}
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="h-7 px-2 text-slate-400 hover:text-white"
                                                      onClick={() => copyToClipboard(block.code, block.id)}
                                                    >
                                                      {copiedId === block.id ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                                                    </Button>
                                                    <Button
                                                      size="sm"
                                                      variant="ghost"
                                                      className="h-7 px-2 text-slate-400 hover:text-white"
                                                      onClick={() => downloadFile(block.filename, block.code)}
                                                    >
                                                      <Download className="h-4 w-4" />
                                                    </Button>
                                                  </div>
                                </div>
                                <div className="p-4 overflow-x-auto">
                                  <pre className="text-xs text-slate-300 font-mono">{block.code}</pre>
                                </div>
                                                {block.description && (
                                                  <div className="px-4 py-2 bg-slate-800/50 border-t border-slate-700">
                                                    <p className="text-xs text-slate-400">{block.description}</p>
                                                  </div>
                                                )}
                                                {executionResults[block.id] && (
                                                  <div className={`px-4 py-3 border-t ${
                                                    executionResults[block.id].success 
                                                      ? 'bg-green-500/10 border-green-500/30' 
                                                      : 'bg-red-500/10 border-red-500/30'
                                                  }`}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                      {executionResults[block.id].success ? (
                                                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                                                      ) : (
                                                        <AlertCircle className="h-4 w-4 text-red-400" />
                                                      )}
                                                      <span className={`text-sm font-medium ${
                                                        executionResults[block.id].success ? 'text-green-400' : 'text-red-400'
                                                      }`}>
                                                        {executionResults[block.id].message}
                                                      </span>
                                                    </div>
                                                    {executionResults[block.id].data && (
                                                      <div className="mt-2 max-h-40 overflow-auto bg-slate-900 rounded p-2">
                                                        <pre className="text-xs text-slate-300 font-mono">
                                                          {JSON.stringify(executionResults[block.id].data, null, 2)}
                                                        </pre>
                                                      </div>
                                                    )}
                                                  </div>
                                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {msg.gcloudCommands && msg.gcloudCommands.length > 0 && (
                          <div className="mt-4">
                            <div className="bg-slate-900 rounded-lg border border-cyan-500/30 overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2 bg-cyan-500/10 border-b border-cyan-500/30">
                                <div className="flex items-center gap-2">
                                  <Cloud className="h-4 w-4 text-cyan-400" />
                                  <span className="text-sm font-mono text-cyan-300">Deploy Commands</span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-slate-400 hover:text-white"
                                  onClick={() => copyToClipboard(msg.gcloudCommands!.join('\n\n'), 'gcloud-cmds')}
                                >
                                  {copiedId === 'gcloud-cmds' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              </div>
                              <div className="p-4 space-y-3">
                                {msg.gcloudCommands.map((cmd, i) => (
                                  <div key={i} className="bg-slate-800 rounded p-3">
                                    <pre className="text-xs text-cyan-300 font-mono whitespace-pre-wrap">{cmd}</pre>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              <div className="border-t border-purple-900/50 backdrop-blur-sm bg-slate-900/30 px-6 py-4">
                <div className="max-w-4xl mx-auto">
                  <div className="flex gap-3">
                    <Input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendCommand()}
                      placeholder="Tell EIGHT what to code..."
                      className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      disabled={isProcessing}
                    />
                    <Button
                      onClick={sendCommand}
                      disabled={!input.trim() || isProcessing}
                      className="bg-purple-600 hover:bg-purple-700 px-6"
                    >
                      {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SQL Console Tab */}
          {activeTab === 'sql' && (
            <div className="flex flex-col h-full p-6">
              <div className="max-w-5xl mx-auto w-full space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-purple-400" />
                    <h2 className="text-lg font-semibold text-white">SQL Console</h2>
                    <span className="text-xs text-slate-400">(Neon PostgreSQL)</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSqlQuery('SELECT * FROM users LIMIT 10;')}
                      className="text-xs"
                    >
                      Users
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSqlQuery('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;')}
                      className="text-xs"
                    >
                      Transactions
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSqlQuery('SELECT * FROM wallets;')}
                      className="text-xs"
                    >
                      Wallets
                    </Button>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden flex-1 flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                    <span className="text-sm text-slate-400">Query Editor</span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSqlQuery('')}
                        className="h-7 px-2 text-slate-400"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={runSQL}
                        disabled={isRunningSQL || !sqlQuery.trim()}
                        className="h-7 bg-green-600 hover:bg-green-700"
                      >
                        {isRunningSQL ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        <span className="ml-1">Run</span>
                      </Button>
                    </div>
                  </div>
                  <textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    className="flex-1 min-h-[150px] p-4 bg-transparent text-sm text-slate-200 font-mono resize-none focus:outline-none"
                    placeholder="Enter your SQL query..."
                    spellCheck={false}
                  />
                </div>

                {sqlResult && (
                  <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                    <div className={`flex items-center gap-2 px-4 py-2 border-b ${sqlResult.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                      {sqlResult.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-400" />
                      )}
                      <span className={`text-sm ${sqlResult.success ? 'text-green-400' : 'text-red-400'}`}>
                        {sqlResult.success ? `Success (${sqlResult.rowCount} rows)` : 'Error'}
                      </span>
                    </div>
                    <div className="p-4 overflow-auto max-h-[300px]">
                      {sqlResult.error ? (
                        <pre className="text-xs text-red-400 font-mono">{sqlResult.error}</pre>
                      ) : sqlResult.data && sqlResult.data.length > 0 ? (
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-700">
                              {Object.keys(sqlResult.data[0]).map((key) => (
                                <th key={key} className="text-left py-2 px-3 text-slate-400 font-medium">{key}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sqlResult.data.map((row, i) => (
                              <tr key={i} className="border-b border-slate-800">
                                {Object.values(row).map((val, j) => (
                                  <td key={j} className="py-2 px-3 text-slate-300 font-mono">
                                    {typeof val === 'object' ? JSON.stringify(val) : String(val ?? 'null')}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <span className="text-slate-400 text-sm">No results</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* API Test Tab */}
          {activeTab === 'api' && (
            <div className="flex flex-col h-full p-6">
              <div className="max-w-5xl mx-auto w-full space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-400" />
                    <h2 className="text-lg font-semibold text-white">API Tester</h2>
                  </div>
                  <div className="flex gap-2">
                    {(['api-server', 'ssbnow-core', 'ssbnowshop'] as const).map((service) => (
                      <button
                        key={service}
                        onClick={() => setSelectedService(service)}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          selectedService === service
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                  <div className="flex gap-3 mb-4">
                    <select
                      value={apiMethod}
                      onChange={(e) => setApiMethod(e.target.value as 'GET' | 'POST' | 'PUT' | 'DELETE')}
                      className="bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-white"
                    >
                      <option>GET</option>
                      <option>POST</option>
                      <option>PUT</option>
                      <option>DELETE</option>
                    </select>
                    <div className="flex-1 flex items-center bg-slate-800 rounded-md border border-slate-700 px-3">
                      <span className="text-xs text-slate-500 mr-2">{serviceUrls[selectedService]}</span>
                      <Input
                        value={apiEndpoint}
                        onChange={(e) => setApiEndpoint(e.target.value)}
                        placeholder="/api/endpoint"
                        className="border-0 bg-transparent text-white p-0 h-auto focus-visible:ring-0"
                      />
                    </div>
                    <Button
                      onClick={testAPI}
                      disabled={isTestingAPI}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isTestingAPI ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                      Send
                    </Button>
                  </div>

                  {apiMethod !== 'GET' && (
                    <div className="mb-4">
                      <label className="text-xs text-slate-400 mb-1 block">Request Body (JSON)</label>
                      <textarea
                        value={apiBody}
                        onChange={(e) => setApiBody(e.target.value)}
                        className="w-full h-32 bg-slate-800 border border-slate-700 rounded-md p-3 text-sm text-slate-200 font-mono resize-none"
                        spellCheck={false}
                      />
                    </div>
                  )}
                </div>

                {apiResult && (
                  <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                    <div className={`flex items-center justify-between px-4 py-2 border-b ${apiResult.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                      <div className="flex items-center gap-2">
                        {apiResult.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-400" />
                        )}
                        <span className={`text-sm font-medium ${apiResult.success ? 'text-green-400' : 'text-red-400'}`}>
                          {apiResult.status || 'Error'}
                        </span>
                      </div>
                      {apiResult.responseTime && (
                        <span className="text-xs text-slate-400">{apiResult.responseTime}ms</span>
                      )}
                    </div>
                    <div className="p-4 overflow-auto max-h-[400px]">
                      {apiResult.error ? (
                        <pre className="text-xs text-red-400 font-mono">{apiResult.error}</pre>
                      ) : (
                        <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                          {JSON.stringify(apiResult.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Schema Tab */}
          {activeTab === 'schema' && (
            <div className="flex flex-col h-full p-6">
              <div className="max-w-6xl mx-auto w-full space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table className="h-5 w-5 text-purple-400" />
                    <h2 className="text-lg font-semibold text-white">Database Schema</h2>
                    <span className="text-xs text-slate-400">(Neon PostgreSQL)</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={fetchSchema}
                    disabled={isLoadingSchema}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isLoadingSchema ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                    {schemaData.length === 0 ? 'Load Schema' : 'Refresh'}
                  </Button>
                </div>

                {schemaData.length === 0 && !isLoadingSchema && (
                  <div className="text-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
                    <FolderTree className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Click &quot;Load Schema&quot; to view database structure</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {schemaData.map((table) => (
                    <div key={table.table} className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border-b border-slate-700">
                        <Database className="h-4 w-4 text-purple-400" />
                        <span className="font-medium text-white">{table.table}</span>
                        <span className="text-xs text-slate-500 ml-auto">{table.columns.length} cols</span>
                      </div>
                      <div className="p-3 max-h-60 overflow-y-auto">
                        {table.columns.map((col) => (
                          <div key={col.name} className="flex items-center justify-between py-1 text-xs border-b border-slate-800 last:border-0">
                            <span className="text-slate-300 font-mono">{col.name}</span>
                            <span className="text-slate-500">{col.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Activity/Logs Tab */}
          {activeTab === 'logs' && (
            <div className="flex flex-col h-full p-6">
              <div className="max-w-5xl mx-auto w-full space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ScrollText className="h-5 w-5 text-green-400" />
                    <h2 className="text-lg font-semibold text-white">System Activity</h2>
                  </div>
                  <Button
                    size="sm"
                    onClick={fetchLogs}
                    disabled={isLoadingLogs}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isLoadingLogs ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                    {logs.length === 0 ? 'Load Activity' : 'Refresh'}
                  </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                    <Database className="h-5 w-5 text-blue-400 mb-2" />
                    <p className="text-xs text-slate-500">Total Users</p>
                    <p className="text-xl font-bold text-white">{systemStats?.totalUsers ?? '--'}</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                    <Wallet className="h-5 w-5 text-green-400 mb-2" />
                    <p className="text-xs text-slate-500">Total TRX</p>
                    <p className="text-xl font-bold text-white">{systemStats?.totalTRX?.toFixed(2) ?? '--'}</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                    <Zap className="h-5 w-5 text-purple-400 mb-2" />
                    <p className="text-xs text-slate-500">Arena Matches</p>
                    <p className="text-xl font-bold text-white">{systemStats?.totalMatches ?? '--'}</p>
                  </div>
                  <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                    <Play className="h-5 w-5 text-yellow-400 mb-2" />
                    <p className="text-xs text-slate-500">Casino Games</p>
                    <p className="text-xl font-bold text-white">{systemStats?.totalGames ?? '--'}</p>
                  </div>
                </div>

                {/* Activity Log */}
                <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700">
                    <Eye className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-slate-400">Recent Activity</span>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                    {logs.length === 0 ? (
                      <p className="text-center text-slate-500 py-8">Click &quot;Load Activity&quot; to view recent events</p>
                    ) : (
                      <div className="space-y-2">
                        {logs.map((log, i) => (
                          <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-800 last:border-0">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              log.level === 'user' ? 'bg-blue-500/20 text-blue-400' :
                              log.level === 'casino' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-purple-500/20 text-purple-400'
                            }`}>
                              {log.level}
                            </span>
                            <span className="text-sm text-slate-300 flex-1">{log.message}</span>
                            <span className="text-xs text-slate-500">{log.time}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Terminal Tab */}
          {activeTab === 'terminal' && (
            <div className="flex flex-col h-full p-6">
              <div className="max-w-5xl mx-auto w-full space-y-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-5 w-5 text-green-400" />
                    <h2 className="text-lg font-semibold text-white">Deploy Commands</h2>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setTerminalHistory(['$ EIGHT Dev Workshop Terminal', '$ Ready for gcloud commands...', ''])}
                  >
                    Clear
                  </Button>
                </div>

                <div className="bg-black rounded-lg border border-slate-700 overflow-hidden flex-1 flex flex-col">
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-xs text-slate-400 ml-2">gcloud terminal</span>
                  </div>
                  <div className="flex-1 p-4 overflow-auto font-mono text-sm">
                    {terminalHistory.map((line, i) => (
                      <div key={i} className={line.startsWith('$') ? 'text-green-400' : 'text-slate-300'}>
                        {line || '\u00A0'}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                  <h3 className="text-sm font-medium text-white mb-3">Quick Deploy Commands</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      {
                        label: 'Deploy api-server',
                        cmd: 'gcloud run deploy api-server --source . --region=us-central1 --allow-unauthenticated',
                      },
                      {
                        label: 'Deploy ssbnow-core',
                        cmd: 'gcloud run deploy ssbnow-core --source . --region=us-central1 --allow-unauthenticated',
                      },
                      {
                        label: 'View logs (api-server)',
                        cmd: 'gcloud run logs read api-server --region=us-central1 --limit=50',
                      },
                      {
                        label: 'List services',
                        cmd: 'gcloud run services list --region=us-central1',
                      },
                    ].map((item, i) => (
                      <div key={i} className="bg-slate-800 rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400">{item.label}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => {
                              copyToClipboard(item.cmd, `cmd-${i}`)
                              setTerminalHistory(prev => [...prev, `$ ${item.cmd}`, 'Copied to clipboard!', ''])
                            }}
                          >
                            {copiedId === `cmd-${i}` ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                          </Button>
                        </div>
                        <pre className="text-xs text-cyan-300 font-mono overflow-x-auto">{item.cmd}</pre>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="flex flex-col h-full p-6">
              <div className="max-w-6xl mx-auto w-full space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-400" />
                    <h2 className="text-lg font-semibold text-white">User Management</h2>
                  </div>
                  <div className="flex gap-2">
                    {(['all', 'agent', 'bridger', 'admin'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => { setUserFilter(filter); setTimeout(fetchUsers, 100) }}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          userFilter === filter ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                    <Button size="sm" onClick={fetchUsers} disabled={isLoadingUsers} className="bg-blue-600 hover:bg-blue-700">
                      {isLoadingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {usersList.length === 0 && !isLoadingUsers && (
                  <div className="text-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
                    <Users className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Click refresh to load users</p>
                  </div>
                )}

                {usersList.length > 0 && (
                  <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700 bg-slate-800/50">
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">User</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">Role</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">Core TRX</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">Play TRX</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersList.map((u) => (
                          <tr key={u.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                            <td className="py-3 px-4">
                              <div>
                                <p className="text-white font-medium">{u.name || u.username || 'Unknown'}</p>
                                <p className="text-xs text-slate-500">{u.email}</p>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 text-xs rounded-full ${
                                u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' :
                                u.role === 'agent' ? 'bg-blue-500/20 text-blue-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-cyan-400 font-mono">{Number(u.balance_trx || 0).toFixed(2)}</td>
                            <td className="py-3 px-4 text-yellow-400 font-mono">{Number(u.play_balance || 0).toFixed(2)}</td>
                            <td className="py-3 px-4">
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => fundUserWallet(u.id, 10, 'core')}>
                                  +10 Core
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => fundUserWallet(u.id, 10, 'play')}>
                                  +10 Play
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="flex flex-col h-full p-6">
              <div className="max-w-6xl mx-auto w-full space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="h-5 w-5 text-yellow-400" />
                    <h2 className="text-lg font-semibold text-white">File Browser</h2>
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{currentDir}</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center bg-slate-800 rounded-md border border-slate-700 px-3">
                      <Search className="h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        value={fileSearch}
                        onChange={(e) => setFileSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchFiles()}
                        placeholder="Search in files..."
                        className="bg-transparent border-0 text-sm text-white p-2 focus:outline-none w-48"
                      />
                    </div>
                    <Button size="sm" onClick={() => fetchFiles(currentDir)} disabled={isLoadingFiles} className="bg-yellow-600 hover:bg-yellow-700">
                      {isLoadingFiles ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-white">Search Results ({searchResults.length})</span>
                      <Button size="sm" variant="ghost" onClick={() => setSearchResults([])}>Clear</Button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {searchResults.map((r, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs bg-slate-800 p-2 rounded cursor-pointer hover:bg-slate-700" onClick={() => readFileContent(r.path)}>
                          <File className="h-3 w-3 text-slate-500" />
                          <span className="text-cyan-400 font-mono">{r.path}:{r.line}</span>
                          <span className="text-slate-400 truncate">{r.content}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* File List */}
                  <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                      <span className="text-sm text-slate-400">Files</span>
                      {currentDir !== '.' && (
                        <Button size="sm" variant="ghost" onClick={() => fetchFiles(currentDir.split('/').slice(0, -1).join('/') || '.')}>
                          <ArrowLeft className="h-3 w-3 mr-1" /> Up
                        </Button>
                      )}
                    </div>
                    <div className="p-2 max-h-96 overflow-y-auto">
                      {filesList.map((f) => (
                        <div
                          key={f.path}
                          onClick={() => f.isDirectory ? fetchFiles(f.path) : readFileContent(f.path)}
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-800 rounded cursor-pointer"
                        >
                          {f.isDirectory ? <Folder className="h-4 w-4 text-yellow-400" /> : <File className="h-4 w-4 text-slate-400" />}
                          <span className="text-slate-300 flex-1">{f.name}</span>
                          {f.size && <span className="text-xs text-slate-600">{(f.size / 1024).toFixed(1)}KB</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* File Content */}
                  <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                      <span className="text-sm text-slate-400 font-mono">{openFile || 'No file selected'}</span>
                      {openFile && (
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(fileContent || '', 'file')}>
                          {copiedId === 'file' ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                    <pre className="p-4 text-xs text-slate-300 font-mono overflow-auto max-h-96 whitespace-pre-wrap">
                      {fileContent || 'Select a file to view its contents'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Debug Tab */}
          {activeTab === 'debug' && (
            <div className="flex flex-col h-full p-6">
              <div className="max-w-5xl mx-auto w-full space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                    <h2 className="text-lg font-semibold text-white">System Debugger</h2>
                  </div>
                  <div className="flex gap-2">
                    {(['all', 'error', 'api', 'db'] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setDebugFilter(filter)}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          debugFilter === filter ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                        }`}
                      >
                        {filter.toUpperCase()}
                      </button>
                    ))}
                    <Button size="sm" onClick={runDiagnostic} disabled={isLoadingDebug} className="bg-red-600 hover:bg-red-700">
                      {isLoadingDebug ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
                      Run Diagnostic
                    </Button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <button
                    onClick={() => fetchDebugLogs()}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-left transition"
                  >
                    <RefreshCw className="h-4 w-4 text-cyan-400 mb-2" />
                    <p className="text-sm text-white font-medium">Fetch Logs</p>
                    <p className="text-xs text-slate-500">Get recent activity</p>
                  </button>
                  <button
                    onClick={fetchServices}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-left transition"
                  >
                    <Activity className="h-4 w-4 text-green-400 mb-2" />
                    <p className="text-sm text-white font-medium">Check Services</p>
                    <p className="text-xs text-slate-500">Ping all endpoints</p>
                  </button>
                  <button
                    onClick={fetchSchema}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-left transition"
                  >
                    <Database className="h-4 w-4 text-purple-400 mb-2" />
                    <p className="text-sm text-white font-medium">DB Schema</p>
                    <p className="text-xs text-slate-500">View table structure</p>
                  </button>
                  <button
                    onClick={fetchUsers}
                    className="p-3 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-left transition"
                  >
                    <Users className="h-4 w-4 text-blue-400 mb-2" />
                    <p className="text-sm text-white font-medium">User List</p>
                    <p className="text-xs text-slate-500">Load all users</p>
                  </button>
                </div>

                {/* Debug Log Output */}
                <div className="bg-black rounded-lg border border-slate-700 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      </div>
                      <span className="text-xs text-slate-400 ml-2">system debugger</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={autoRefresh}
                          onChange={(e) => setAutoRefresh(e.target.checked)}
                          className="w-3 h-3 rounded bg-slate-700"
                        />
                        Auto-refresh
                      </label>
                      <Button size="sm" variant="ghost" onClick={() => setDebugLogs([])}>
                        Clear
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto font-mono text-xs space-y-1">
                    {debugLogs.length === 0 && (
                      <div className="text-slate-500 text-center py-8">
                        Click &quot;Run Diagnostic&quot; to check system health
                      </div>
                    )}
                    {debugLogs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-slate-600 whitespace-nowrap">[{new Date(log.time).toLocaleTimeString()}]</span>
                        <span className={`uppercase font-bold ${
                          log.type === 'error' ? 'text-red-400' :
                          log.type === 'warning' ? 'text-yellow-400' :
                          log.type === 'success' ? 'text-green-400' :
                          log.type === 'api' ? 'text-cyan-400' :
                          log.type === 'db' ? 'text-purple-400' :
                          'text-slate-400'
                        }`}>[{log.type}]</span>
                        <span className="text-slate-300">{log.message}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System Stats Summary */}
                {systemStats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 text-center">
                      <p className="text-2xl font-bold text-white">{systemStats.totalUsers || 0}</p>
                      <p className="text-xs text-slate-500">Total Users</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 text-center">
                      <p className="text-2xl font-bold text-cyan-400">{Number(systemStats.totalTrx || 0).toFixed(2)}</p>
                      <p className="text-xs text-slate-500">Total TRX</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 text-center">
                      <p className="text-2xl font-bold text-yellow-400">{systemStats.casinoGames || 0}</p>
                      <p className="text-xs text-slate-500">Casino Games</p>
                    </div>
                    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4 text-center">
                      <p className="text-2xl font-bold text-green-400">{systemStats.arenaMatches || 0}</p>
                      <p className="text-xs text-slate-500">Arena Matches</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="flex flex-col h-full p-6">
              <div className="max-w-5xl mx-auto w-full space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-green-400" />
                    <h2 className="text-lg font-semibold text-white">Services Monitor</h2>
                  </div>
                  <Button size="sm" onClick={fetchServices} disabled={isLoadingServices} className="bg-green-600 hover:bg-green-700">
                    {isLoadingServices ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                    Check Status
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(serviceStatus).map(([name, status]) => (
                    <div key={name} className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Server className="h-5 w-5 text-slate-400" />
                          <span className="font-medium text-white">{name}</span>
                        </div>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          status.status === 'online' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {status.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Latency</span>
                        <span className={`font-mono ${status.latency < 500 ? 'text-green-400' : status.latency < 1000 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {status.latency}ms
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {Object.keys(serviceStatus).length === 0 && !isLoadingServices && (
                  <div className="text-center py-12 bg-slate-900/50 rounded-lg border border-slate-800">
                    <Activity className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Click &quot;Check Status&quot; to monitor services</p>
                  </div>
                )}

                {/* Service URLs */}
                <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
                  <h3 className="text-sm font-medium text-white mb-3">Service URLs</h3>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between p-2 bg-slate-800 rounded">
                      <span className="text-slate-400">Vercel (Main)</span>
                      <span className="text-cyan-400">v0-live-site-deployment-pink.vercel.app</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-800 rounded">
                      <span className="text-slate-400">api-server</span>
                      <span className="text-cyan-400">api-server-823579957639.us-central1.run.app</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-800 rounded">
                      <span className="text-slate-400">ssbnow-core</span>
                      <span className="text-cyan-400">ssbnow-core-823579957639.us-central1.run.app</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-slate-800 rounded">
                      <span className="text-slate-400">Database</span>
                      <span className="text-cyan-400">Neon PostgreSQL (small-block-81100841)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
