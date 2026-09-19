'use client'

import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { ArrowRight, Wallet, MessageSquare, Trophy, Network } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { WeaveLogo } from '@/components/weave-logo'

const WeaveHero3D = dynamic(() => import('@/components/weave-hero-3d').then(m => m.WeaveHero3D), { ssr: false })

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push('/weave')
    }
  }, [user, router])

  return (
    <div className="min-h-screen bg-[#08090f] overflow-x-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 opacity-[0.07] pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(232,185,63,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.06)_1px,transparent_1px)] bg-[size:44px_44px]"></div>
      </div>
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-[#e8b93f]/10 rounded-full filter blur-[130px] pointer-events-none"></div>
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#14b8a6]/10 rounded-full filter blur-[130px] pointer-events-none"></div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation */}
        <nav className="flex items-center justify-between p-4 md:p-8 border-b border-white/5 backdrop-blur-xl bg-[#08090f]/50 sticky top-0 z-50">
          <WeaveLogo />
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-[#ece7da]/70 hover:text-white hover:bg-white/5 text-sm px-3 md:px-4">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-[#e8b93f] to-[#14b8a6] hover:opacity-90 text-[#08090f] font-bold border-0 shadow-lg shadow-[#e8b93f]/20 text-sm px-3 md:px-6">
                <span className="hidden sm:inline">Get Started</span>
                <span className="sm:hidden">Join</span>
                <ArrowRight className="h-4 w-4 ml-1 md:ml-2" />
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 md:py-28 overflow-hidden">
          <div className="w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center px-2">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-md">
                <div className="w-2 h-2 bg-[#e8b93f] rounded-full animate-pulse" />
                <p className="text-[#e8b93f] font-bold text-[10px] md:text-xs uppercase tracking-widest">Ecosystem Live</p>
              </div>

              <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-[1.1] tracking-tight">
                A living system for<br />work, money, and<br /><span className="bg-clip-text text-transparent bg-gradient-to-r from-[#e8b93f] to-[#14b8a6]">human presence</span>
              </h1>

              <p className="text-lg md:text-xl text-[#9a94a6] mb-10 max-w-xl mx-auto md:mx-0 leading-relaxed">
                WEAVE is an operating environment for your business and participation. One account for your wallet, your network, and your institutional support.
              </p>

              <div className="flex flex-col sm:flex-row items-center md:items-start justify-center md:justify-start gap-4 mb-16">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-white text-[#08090f] hover:bg-[#ece7da] px-10 py-7 text-lg font-bold border-0 transition-transform active:scale-95 shadow-2xl shadow-white/10">
                    Create Your Account
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-[#14b8a6]/30 bg-[#14b8a6]/5 hover:bg-[#14b8a6]/10 px-10 py-7 text-lg font-bold backdrop-blur-xl transition-transform active:scale-95 text-[#14b8a6]"
                  onClick={() => {
                    const prompt = (window as any).deferredPrompt;
                    if (prompt) {
                      prompt.prompt();
                    } else {
                      alert("To install WEAVE, use 'Add to Home Screen' in your browser's menu.");
                    }
                  }}
                >
                  Install App
                </Button>
              </div>
            </div>

            {/* Signature 3D moment */}
            <div className="h-[320px] md:h-[440px] w-full">
              <WeaveHero3D />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mt-4 max-w-5xl mx-auto w-full px-2">
            {[
              { val: "TRX", label: "Native Wallet" },
              { val: "24/7", label: "Participation" },
              { val: "3-tier", label: "Human Network" },
              { val: "AI", label: "Institutional Support" }
            ].map((stat, i) => (
              <div key={i} className="group relative">
                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-4 md:p-6 transition-all hover:bg-white/[0.08] hover:border-white/20">
                  <div className="text-xl md:text-3xl font-black text-[#e8b93f] mb-1">{stat.val}</div>
                  <p className="text-[#9a94a6] text-[10px] md:text-xs font-bold uppercase tracking-widest">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <div className="px-4 md:px-8 py-24 border-t border-white/5 bg-black/20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 px-4">
              <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">One movement. Many places.</h2>
              <p className="text-[#9a94a6] max-w-2xl mx-auto text-lg">A coherent environment where every interaction counts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { icon: Wallet, title: "Wallet & Ledger", desc: "Manage your TRX and USDT. A single, transparent source of truth for your value.", color: "text-[#e8b93f]" },
                { icon: Network, title: "Institutional Network", desc: "Coordinate with Agents, Bridgers, and Clients within a structured human network.", color: "text-[#14b8a6]" },
                { icon: MessageSquare, title: "The Lounge", desc: "Participate in real-time communication and stay in sync with your team.", color: "text-[#8b7cf6]" },
                { icon: Trophy, title: "Arena", desc: "Compete and participate in specialized environments designed for action.", color: "text-[#e8b93f]" }
              ].map((feat, i) => (
                <div key={i} className="group h-full">
                  <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-3xl p-8 transition-all hover:bg-white/[0.07] hover:border-white/20 h-full flex flex-col items-start text-left">
                    <div className="p-3 rounded-2xl bg-white/5 mb-6 group-hover:scale-110 transition-transform">
                      <feat.icon className={`h-8 w-8 ${feat.color}`} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{feat.title}</h3>
                    <p className="text-[#9a94a6] text-sm leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-white/5 py-12 px-6 md:px-8 bg-[#08090f]">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <WeaveLogo size="sm" />
            <div className="flex gap-8 text-[#9a94a6] text-sm font-medium">
              <a href="#" className="hover:text-white transition-colors uppercase tracking-widest text-[10px]">Status</a>
              <a href="#" className="hover:text-white transition-colors uppercase tracking-widest text-[10px]">Legal</a>
              <a href="#" className="hover:text-white transition-colors uppercase tracking-widest text-[10px]">Security</a>
            </div>
            <p className="text-[10px] text-[#5c586a] font-bold uppercase tracking-[0.2em]">© 2026 WEAVE. ALL RIGHTS RESERVED.</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
