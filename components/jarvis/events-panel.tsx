"use client"

import { cn } from "@/lib/utils"
import { Zap } from "lucide-react"

export interface EventEntry {
  id: string
  text: string
  timestamp: Date
  type: "device" | "test" | "failure" | "payment" | "request" | "audio"
}

interface EventsPanelProps {
  events: EventEntry[]
}

const typeColors: Record<EventEntry["type"], string> = {
  device: "border-l-primary",
  test: "border-l-chart-2",
  failure: "border-l-destructive",
  payment: "border-l-chart-3",
  request: "border-l-primary",
  audio: "border-l-destructive",
}

export function EventsPanel({ events }: EventsPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header - refined lighter */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 bg-card/20">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <Zap className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground/90">Eventos</span>
      </div>

      {/* Events list - lighter cards with more breathing room */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {events.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground/60 text-sm">
            Aguardando...
          </div>
        ) : (
          events.map((event, index) => (
            <div
              key={event.id}
              className={cn(
                "p-3.5 rounded-xl bg-card/60 border border-border/50 border-l-2 flow-in-left",
                "hover:bg-card/80 transition-colors",
                typeColors[event.type]
              )}
              style={{ animationDelay: `${Math.min(index, 5) * 0.05}s` }}
            >
              <div className="text-[13px] text-foreground/90 leading-relaxed">
                {event.text}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground/70 mt-2">
                {event.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Data stream indicator - subtle */}
      <div className="h-px bg-border/30 overflow-hidden">
        <div 
          className="h-full w-1/4 bg-gradient-to-r from-transparent via-primary/40 to-transparent data-stream-left"
        />
      </div>
    </div>
  )
}
