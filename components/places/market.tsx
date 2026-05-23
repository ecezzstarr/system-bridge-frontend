'use client'

import { marketItems } from '@/lib/mock-places'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Star } from 'lucide-react'

export default function MarketPlace() {
  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-white mb-1">Marketplace</h1>
        <p className="text-xs text-slate-400">Buy and sell digital assets with TRX</p>
      </div>

      {/* Market Grid - Mobile optimized */}
      <div className="space-y-3">
        {marketItems.map((item) => (
          <div key={item.id} className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 hover:border-emerald-500/50 transition-all">
            {/* Item Header */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1 min-w-0">
                <div className="text-lg mb-1">{item.sellerAvatar}</div>
                <h3 className="text-sm font-bold text-white truncate">{item.name}</h3>
              </div>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full border border-emerald-500/50 flex-shrink-0">
                {item.category}
              </span>
            </div>

            {/* Description */}
            <p className="text-slate-400 text-xs mb-3 line-clamp-2">{item.description}</p>

            {/* Seller Info */}
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-700">
              <span className="text-lg flex-shrink-0">{item.sellerAvatar}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">Seller</p>
                <p className="text-xs text-white font-medium truncate">{item.seller}</p>
              </div>
            </div>

            {/* Rating and Price */}
            <div className="flex items-end justify-between gap-2 mb-3">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                <span className="text-xs text-white font-medium">{item.rating}</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Price</p>
                <p className="text-lg font-bold text-emerald-400">{item.price} TRX</p>
              </div>
            </div>

            {/* Action Button */}
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-0 h-8 text-xs">
              <ShoppingCart className="h-3 w-3 mr-1" />
              Purchase
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
