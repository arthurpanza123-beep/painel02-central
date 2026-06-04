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
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold tracking-wider text-primary">EVENTOS RECEBIDOS</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          {events.length} ativos
        </span>
      </div>

      {/* Events list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {events.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aguardando eventos...
          </div>
        ) : (
          events.map((event, index) => (
            <div
              key={event.id}
              className={cn(
                "p-3 rounded-lg bg-secondary/50 border-l-2 flow-in-left",
                typeColors[event.type]
              )}
              style={{ animationDelay: `${Math.min(index, 5) * 0.05}s` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-mono text-muted-foreground mb-1">
                    EVENTO RECEBIDO
                  </div>
                  <div className="text-sm text-foreground leading-relaxed">
                    {event.text}
                  </div>
                </div>
                <div className="text-[9px] font-mono text-muted-foreground shrink-0">
                  {event.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Data stream indicator */}
      <div className="h-1 bg-secondary overflow-hidden">
        <div 
          className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary/50 to-transparent data-stream-left"
        />
      </div>
    </div>
  )
}
