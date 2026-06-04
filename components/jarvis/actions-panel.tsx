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
    <div className="flex flex-col h-full bg-gradient-to-b from-card/50 to-background">
      {/* Header - premium style */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border bg-card/30">
        <div className="p-2 rounded-lg bg-chart-2/15">
          <ArrowRight className="w-4 h-4 text-chart-2" />
        </div>
        <span className="text-sm font-semibold tracking-wide text-foreground">Ações</span>
      </div>

      {/* Actions list - premium cards */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {actions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhuma ação...
          </div>
        ) : (
          actions.map((action, index) => {
            const config = statusConfig[action.status]
            return (
              <div
                key={action.id}
                className={cn(
                  "p-4 rounded-xl bg-gradient-to-br from-card to-secondary/30 border border-border/80 border-l-3 flow-in-right",
                  action.status === "completed" ? "border-l-chart-2" : 
                  action.status === "executing" ? "border-l-primary" : "border-l-muted-foreground"
                )}
                style={{ animationDelay: `${Math.min(index, 5) * 0.05}s` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={config.color}>{config.icon}</span>
                  <span className={cn("text-[10px] font-semibold", config.color)}>
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

      {/* Data stream indicator */}
      <div className="h-1 bg-gradient-to-r from-transparent via-border to-transparent overflow-hidden">
        <div 
          className="h-full w-1/3 bg-gradient-to-r from-transparent via-chart-2/50 to-transparent data-stream-right"
        />
      </div>
    </div>
  )
}
