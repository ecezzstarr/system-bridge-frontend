"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Send, Loader2, Quote, BookOpen, Radio, Lightbulb, CalendarDays } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface Cadence {
  id: string
  cadence_type: "thought" | "quote" | "experience" | "lesson" | "event"
  content: string
  context?: string | null
  created_at: string
  author_id: string
  author_name: string
}

const typeMeta = {
  thought: { label: "Thought", icon: Lightbulb },
  quote: { label: "Quote", icon: Quote },
  experience: { label: "Experience", icon: Radio },
  lesson: { label: "Lesson", icon: BookOpen },
  event: { label: "Event", icon: CalendarDays },
}

export default function SearchPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const query = searchParams.get("q")?.trim() || ""
  const [value, setValue] = useState(query)
  const [cadences, setCadences] = useState<Cadence[]>([])
  const [loading, setLoading] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [content, setContent] = useState("")
  const [context, setContext] = useState("")
  const [cadenceType, setCadenceType] = useState<Cadence["cadence_type"]>("thought")
  const [publishError, setPublishError] = useState("")

  useEffect(() => setValue(query), [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/cadences${query ? `?q=${encodeURIComponent(query)}` : ""}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Search failed")))
      .then((data) => { if (!cancelled) setCadences(data.cadences || []) })
      .catch(() => { if (!cancelled) setCadences([]) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [query])

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = value.trim()
    router.push(next ? `/search?q=${encodeURIComponent(next)}` : "/search")
  }

  async function publishCadence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPublishError("")
    setPublishing(true)
    try {
      const response = await fetch("/api/cadences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, context, cadenceType }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Unable to publish cadence")
      setContent("")
      setContext("")
      setCadences((current) => [data.cadence, ...current])
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : "Unable to publish cadence")
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-8">
      <div className="space-y-2">
        <p className="text-sm font-medium text-primary">WEAVE SEARCH</p>
        <h1 className="text-3xl font-bold tracking-tight">Search the human stream</h1>
        <p className="max-w-2xl text-muted-foreground">
          Search what people have said, lived, noticed, learned, and recorded in Weave. Results are human cadences, not generated answers.
        </p>
      </div>

      <form onSubmit={submitSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus value={value} onChange={(event) => setValue(event.target.value)} placeholder="What are you thinking about? What problem are you encountering?" className="h-12 pl-11 text-base" aria-label="Search the Weave" />
        </div>
        <Button type="submit" size="lg">Search</Button>
      </form>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4">
            <h2 className="font-semibold">Add a cadence</h2>
            <p className="text-sm text-muted-foreground">Share a thought, quote, lesson, experience, or short event from your own perspective.</p>
          </div>
          <form onSubmit={publishCadence} className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(typeMeta) as Cadence["cadence_type"][]).map((type) => {
                const Icon = typeMeta[type].icon
                return <Button key={type} type="button" size="sm" variant={cadenceType === type ? "default" : "outline"} onClick={() => setCadenceType(type)}><Icon className="mr-1.5 h-4 w-4" />{typeMeta[type].label}</Button>
              })}
            </div>
            <Textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} placeholder="What happened, what did you notice, or what do you believe from experience?" required />
            <Input value={context} onChange={(event) => setContext(event.target.value)} maxLength={1000} placeholder="Optional context: where or when this came from" />
            {publishError && <p className="text-sm text-destructive">{publishError}</p>}
            <Button type="submit" disabled={publishing || !content.trim()}><Send className="mr-2 h-4 w-4" />{publishing ? "Publishing..." : "Add to the Weave"}</Button>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold">{query ? `Cadences around “${query}”` : "Recent cadences"}</h2>
            <p className="text-sm text-muted-foreground">People's perspectives remain attributed to the people who shared them.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Listening across the Weave...</div>
        ) : cadences.length === 0 ? (
          <Card><CardContent className="py-14 text-center"><Search className="mx-auto h-9 w-9 text-muted-foreground/50" /><h3 className="mt-4 font-semibold">No cadences found</h3><p className="mt-1 text-sm text-muted-foreground">Try another thought, phrase, or problem. You can also be the first person to record a cadence about it.</p></CardContent></Card>
        ) : (
          <div className="space-y-4">
            {cadences.map((cadence) => {
              const Icon = typeMeta[cadence.cadence_type]?.icon || Lightbulb
              return (
                <Card key={cadence.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><Icon className="h-4 w-4" />{typeMeta[cadence.cadence_type]?.label || "Cadence"}<span>·</span><span>{cadence.author_name}</span><span>·</span><time dateTime={cadence.created_at}>{new Date(cadence.created_at).toLocaleDateString()}</time></div>
                    <p className="mt-4 whitespace-pre-wrap text-lg leading-8">{cadence.content}</p>
                    {cadence.context && <p className="mt-4 border-l-2 pl-4 text-sm text-muted-foreground">Context: {cadence.context}</p>}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
