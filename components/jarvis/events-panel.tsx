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
      {/* Header - more padding */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border/30">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-xs font-medium tracking-wider text-primary/80">EVENTOS</span>
      </div>

      {/* Events list - more spacing */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground/60 text-sm">
            Aguardando...
          </div>
        ) : (
          events.map((event, index) => (
            <div
              key={event.id}
              className={cn(
                "p-4 rounded-xl bg-secondary/40 border-l-2 flow-in-left",
                typeColors[event.type]
              )}
              style={{ animationDelay: `${Math.min(index, 5) * 0.05}s` }}
            >
              <div className="text-sm text-foreground leading-relaxed">
                {event.text}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground/60 mt-2">
                {event.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Subtle data stream indicator */}
      <div className="h-0.5 bg-secondary/50 overflow-hidden">
        <div 
          className="h-full w-1/4 bg-gradient-to-r from-transparent via-primary/40 to-transparent data-stream-left"
        />
      </div>
    </div>
  )
}
