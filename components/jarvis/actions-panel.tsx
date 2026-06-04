"use client"

import { cn } from "@/lib/utils"
import { ArrowRight, Check, Loader2 } from "lucide-react"

export interface ActionEntry {
  id: string
  text: string
  timestamp: Date
  status: "pending" | "executing" | "completed"
}

interface ActionsPanelProps {
  actions: ActionEntry[]
}

const statusConfig: Record<ActionEntry["status"], { icon: React.ReactNode; color: string }> = {
  pending: { icon: <ArrowRight className="w-3 h-3" />, color: "text-muted-foreground" },
  executing: { icon: <Loader2 className="w-3 h-3 animate-spin" />, color: "text-primary" },
  completed: { icon: <Check className="w-3 h-3" />, color: "text-chart-2" },
}

export function ActionsPanel({ actions }: ActionsPanelProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header - more padding */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border/30">
        <ArrowRight className="w-4 h-4 text-chart-2" />
        <span className="text-xs font-medium tracking-wider text-chart-2/80">AÇÕES</span>
      </div>

      {/* Actions list - more spacing */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {actions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground/60 text-sm">
            Nenhuma ação...
          </div>
        ) : (
          actions.map((action, index) => {
            const config = statusConfig[action.status]
            return (
              <div
                key={action.id}
                className={cn(
                  "p-4 rounded-xl bg-secondary/40 border-l-2 flow-in-right",
                  action.status === "completed" ? "border-l-chart-2" : 
                  action.status === "executing" ? "border-l-primary" : "border-l-muted-foreground"
                )}
                style={{ animationDelay: `${Math.min(index, 5) * 0.05}s` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={config.color}>{config.icon}</span>
                  <span className={cn("text-[10px] font-mono", config.color)}>
                    {action.status === "completed" ? "OK" : "..."}
                  </span>
                </div>
                <div className="text-sm text-foreground leading-relaxed">
                  {action.text}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Subtle data stream indicator */}
      <div className="h-0.5 bg-secondary/50 overflow-hidden">
        <div 
          className="h-full w-1/4 bg-gradient-to-r from-transparent via-chart-2/40 to-transparent data-stream-right"
        />
      </div>
    </div>
  )
}
