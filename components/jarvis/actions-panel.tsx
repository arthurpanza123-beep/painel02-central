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
      {/* Header - refined lighter */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40 bg-card/20">
        <div className="p-2 rounded-lg bg-chart-2/10 border border-chart-2/20">
          <ArrowRight className="w-3.5 h-3.5 text-chart-2" />
        </div>
        <span className="text-sm font-semibold text-foreground/90">Ações</span>
      </div>

      {/* Actions list - lighter cards, better hierarchy */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {actions.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground/60 text-sm">
            Nenhuma ação...
          </div>
        ) : (
          actions.map((action, index) => {
            const config = statusConfig[action.status]
            return (
              <div
                key={action.id}
                className={cn(
                  "p-3.5 rounded-xl bg-card/60 border border-border/50 border-l-2 flow-in-right",
                  "hover:bg-card/80 transition-colors",
                  action.status === "completed" ? "border-l-chart-2/80" : 
                  action.status === "executing" ? "border-l-primary/80" : "border-l-muted-foreground/40"
                )}
                style={{ animationDelay: `${Math.min(index, 5) * 0.05}s` }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={cn("opacity-80", config.color)}>{config.icon}</span>
                  <span className={cn("text-[10px] font-semibold uppercase tracking-wide", config.color)}>
                    {action.status === "completed" ? "Concluído" : action.status === "executing" ? "Executando" : "Pendente"}
                  </span>
                </div>
                <div className="text-[13px] text-foreground/90 leading-relaxed">
                  {action.text}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Data stream indicator - subtle */}
      <div className="h-px bg-border/30 overflow-hidden">
        <div 
          className="h-full w-1/4 bg-gradient-to-r from-transparent via-chart-2/40 to-transparent data-stream-right"
        />
      </div>
    </div>
  )
}
