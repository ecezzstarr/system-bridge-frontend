"use client"

import { useState } from "react"
import {
  Search,
  Plus,
  ShoppingBag,
  Filter,
  Grid,
  List,
  Heart,
  Share2,
  Tag,
} from "lucide-react"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useMarketplaceItems } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import api from "@/lib/api"

const categories = [
  "All",
  "Digital",
  "Services",
  "Collectibles",
  "Courses",
  "Memberships",
  "Other",
]

const statusConfig = {
  available: { label: "Available", color: "bg-primary/10 text-primary" },
  sold: { label: "Sold", color: "bg-muted text-muted-foreground" },
  reserved: { label: "Reserved", color: "bg-warning/10 text-warning" },
  removed: { label: "Removed", color: "bg-destructive/10 text-destructive" },
}

export default function MarketplacePage() {
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("All")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const { data: itemsData, isLoading, mutate } = useMarketplaceItems({
    category: category === "All" ? undefined : category.toLowerCase(),
    status: "available",
    limit: 30,
  })

  const items = itemsData?.data || []
  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase())
  )

  const handlePurchase = async (itemId: string) => {
    const result = await api.purchaseMarketplaceItem(itemId)
    if (result.success) {
      mutate()
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Marketplace
          </h1>
          <p className="text-muted-foreground">
            Buy and sell digital goods and services
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          List Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search marketplace..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40">
              <Tag className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex rounded-lg border border-border">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Items */}
      {isLoading ? (
        <div
          className={cn(
            "grid gap-4",
            viewMode === "grid"
              ? "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid-cols-1"
          )}
        >
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse overflow-hidden">
              <div className="aspect-square bg-secondary" />
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-4 w-full rounded bg-secondary" />
                  <div className="h-3 w-24 rounded bg-secondary" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">No items found</p>
          <p className="text-sm text-muted-foreground">
            {search ? "Try adjusting your search" : "List an item to get started"}
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const config = statusConfig[item.status]
            return (
              <Card
                key={item.id}
                className="group overflow-hidden transition-colors hover:border-primary/50"
              >
                {/* Image */}
                <div className="relative aspect-square bg-secondary">
                  {item.images[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <Badge
                    variant="secondary"
                    className="absolute left-2 top-2 capitalize"
                  >
                    {item.category}
                  </Badge>
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Heart className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <CardContent className="p-4">
                  <h3 className="font-medium line-clamp-1">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={item.seller.avatar} />
                      <AvatarFallback className="text-xs">
                        {item.seller.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {item.seller.displayName}
                    </span>
                  </div>
                </CardContent>

                <CardFooter className="flex items-center justify-between border-t border-border p-4">
                  <p className="font-mono text-lg font-bold">
                    {item.price.toLocaleString()}{" "}
                    <span className="text-sm font-normal text-muted-foreground">TRX</span>
                  </p>
                  <Button
                    size="sm"
                    disabled={item.status !== "available"}
                    onClick={() => handlePurchase(item.id)}
                  >
                    Buy Now
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const config = statusConfig[item.status]
            return (
              <Card
                key={item.id}
                className="group overflow-hidden transition-colors hover:border-primary/50"
              >
                <div className="flex">
                  {/* Image */}
                  <div className="relative h-40 w-40 flex-shrink-0 bg-secondary">
                    {item.images[0] ? (
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium">{item.title}</h3>
                          <Badge
                            variant="secondary"
                            className="mt-1 capitalize"
                          >
                            {item.category}
                          </Badge>
                        </div>
                        <p className="font-mono text-lg font-bold">
                          {item.price.toLocaleString()}{" "}
                          <span className="text-sm font-normal text-muted-foreground">
                            TRX
                          </span>
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={item.seller.avatar} />
                          <AvatarFallback className="text-xs">
                            {item.seller.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-muted-foreground">
                          {item.seller.displayName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                          <Heart className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          disabled={item.status !== "available"}
                          onClick={() => handlePurchase(item.id)}
                        >
                          Buy Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
