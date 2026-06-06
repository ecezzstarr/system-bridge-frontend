'use client'

import { useState } from 'react'
import { Store, Plus, Search, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { marketItems } from '@/lib/mock-places'
import { BottomNav } from '@/components/bottom-nav'

export default function MarketPage() {
  const [search, setSearch] = useState('')
  
  const filteredItems = marketItems.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col bg-slate-950 shadow-2xl shadow-emerald-900/10">
        {/* Header */}
        <header className="p-6 border-b border-slate-800/50 sticky top-0 bg-slate-950/80 backdrop-blur-md z-50">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                <Store className="h-5 w-5" />
                Market
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Trade Assets</p>
            </div>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl gap-2">
              <Plus className="h-4 w-4" />
              Advertise
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Search items..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-900/50 border-slate-800 pl-10 rounded-xl text-sm"
            />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 space-y-4 overflow-y-auto">
          {filteredItems.map((item) => (
            <div key={item.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex gap-4 hover:border-emerald-500/30 transition-colors group">
              <div className="w-16 h-16 rounded-xl bg-slate-800 flex items-center justify-center text-2xl">
                {item.sellerAvatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-white truncate">{item.name}</h3>
                  <span className="text-emerald-400 font-mono font-bold text-sm">{item.price} TRX</span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-1 mb-2">{item.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">By {item.seller}</span>
                  <button className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase group-hover:gap-2 transition-all">
                    View Details
                    <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {filteredItems.length === 0 && (
            <div className="py-20 text-center">
              <Store className="h-12 w-12 text-slate-800 mx-auto mb-4" />
              <p className="text-slate-500">No items found in the marketplace</p>
            </div>
          )}
        </main>

        <BottomNav />
      </div>
    </div>
  )
}
