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
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <ArrowRight className="w-4 h-4 text-chart-2" />
        <span className="text-xs font-semibold tracking-wider text-chart-2">AÇÕES DISPARADAS</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">
          {actions.filter(a => a.status === "completed").length}/{actions.length}
        </span>
      </div>

      {/* Actions list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {actions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma ação ainda...
          </div>
        ) : (
          actions.map((action, index) => {
            const config = statusConfig[action.status]
            return (
              <div
                key={action.id}
                className={cn(
                  "p-3 rounded-lg bg-secondary/50 border-l-2 flow-in-right",
                  action.status === "completed" ? "border-l-chart-2" : 
                  action.status === "executing" ? "border-l-primary" : "border-l-muted-foreground"
                )}
                style={{ animationDelay: `${Math.min(index, 5) * 0.05}s` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={config.color}>{config.icon}</span>
                      <span className={cn("text-[10px] font-mono", config.color)}>
                        {action.status === "completed" ? "CONCLUÍDO" : 
                         action.status === "executing" ? "EXECUTANDO" : "PREPARANDO"}
                      </span>
                    </div>
                    <div className="text-sm text-foreground leading-relaxed mt-1">
                      {action.text}
                    </div>
                  </div>
                  <div className="text-[9px] font-mono text-muted-foreground shrink-0">
                    {action.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Data stream indicator */}
      <div className="h-1 bg-secondary overflow-hidden">
        <div 
          className="h-full w-1/3 bg-gradient-to-r from-transparent via-chart-2/50 to-transparent data-stream-right"
        />
      </div>
    </div>
  )
}
