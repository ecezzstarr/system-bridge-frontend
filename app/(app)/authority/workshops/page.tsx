'use client'

import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { 
  Code, GitBranch, Zap, Terminal, Settings, ArrowLeft, 
  Send, Bot, Shield, Activity, Globe, Rocket, CheckCircle2,
  Database, Wallet, ShieldAlert,
  ChevronRight, Sparkles, RefreshCcw, Cpu, ShieldCheck, 
  Key, ScrollText, History, Users, Link2, 
  Boxes, MoreHorizontal, Play, Anchor, Search
} from 'lucide-react'
import Link from 'next/link'
import { EcosystemNav } from '@/components/ecosystem-nav'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
