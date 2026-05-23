'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Zap, Globe, Users, Shield } from 'lucide-react'
import { useAuth } from '@/lib/auth-provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,212,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,212,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Animated orbs background */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl animate-pulse delay-700"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navigation */}
        <nav className="flex items-center justify-between p-6 md:p-8 border-b border-slate-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400">
              SSBNOW.SHOP
            </div>
            <div className="text-xs text-slate-500">
              Weave of Presence
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0">
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-20 md:py-32">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-block mb-6 px-4 py-2 bg-cyan-500/10 border border-cyan-500/50 rounded-full">
              <p className="text-cyan-400 font-semibold text-sm">Welcome to the Presence Ecosystem</p>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 mb-6 leading-tight">
              Weave Your Digital Presence
            </h1>

            <p className="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">
              Connect, collaborate, and cultivate your presence across the digital ecosystem. Manage your identity, build your network, and thrive with SSBNOW.SHOP.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link href="/register">
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-8 py-6 text-lg border-0">
                  Create Account
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="border-slate-600 hover:bg-slate-800/50 px-8 py-6 text-lg">
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Live Status Indicator */}
            <div className="flex items-center justify-center gap-2 mb-8">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-400 text-sm font-semibold">System Online</span>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-16">
              <div className="group">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all group-hover:bg-slate-900/80">
                  <div className="text-3xl font-bold text-cyan-400 mb-2">12.5K</div>
                  <p className="text-slate-400 text-sm">Active Users</p>
                </div>
              </div>
              <div className="group">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all group-hover:bg-slate-900/80">
                  <div className="text-3xl font-bold text-blue-400 mb-2">99.9%</div>
                  <p className="text-slate-400 text-sm">Uptime</p>
                </div>
              </div>
              <div className="group">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-all group-hover:bg-slate-900/80">
                  <div className="text-3xl font-bold text-purple-400 mb-2">48+</div>
                  <p className="text-slate-400 text-sm">Countries</p>
                </div>
              </div>
              <div className="group">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-pink-500/50 transition-all group-hover:bg-slate-900/80">
                  <div className="text-3xl font-bold text-pink-400 mb-2">2.1M</div>
                  <p className="text-slate-400 text-sm">Transactions</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="px-6 md:px-8 py-20 border-t border-slate-700/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">Why Choose Weave</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="group">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-cyan-500/50 transition-all group-hover:bg-slate-900/80 h-full">
                  <Zap className="h-8 w-8 text-cyan-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Lightning Fast</h3>
                  <p className="text-slate-400 text-sm">Experience ultra-low latency connections and instant transactions across the ecosystem.</p>
                </div>
              </div>

              <div className="group">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all group-hover:bg-slate-900/80 h-full">
                  <Globe className="h-8 w-8 text-blue-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Global Network</h3>
                  <p className="text-slate-400 text-sm">Connect with users and opportunities across the globe with our distributed infrastructure.</p>
                </div>
              </div>

              <div className="group">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-all group-hover:bg-slate-900/80 h-full">
                  <Users className="h-8 w-8 text-purple-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Collaborative Tools</h3>
                  <p className="text-slate-400 text-sm">Build meaningful connections and collaborate seamlessly with our intuitive platform.</p>
                </div>
              </div>

              <div className="group">
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6 hover:border-pink-500/50 transition-all group-hover:bg-slate-900/80 h-full">
                  <Shield className="h-8 w-8 text-pink-400 mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Secure & Private</h3>
                  <p className="text-slate-400 text-sm">Your data is protected with enterprise-grade encryption and advanced security measures.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-700/50 py-8 px-6 md:px-8 text-center text-slate-500">
          <p className="text-sm">© 2026 SSBNOW.SHOP - Weave of Presence. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}
