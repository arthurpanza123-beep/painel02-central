"use client"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface LogEntry {
  id: string
  timestamp: Date
  level: "info" | "success" | "warning" | "error"
  code: string
  message?: string
}

const levelConfig = {
  info: { color: "text-muted-foreground", prefix: "INFO" },
  success: { color: "text-chart-2", prefix: "SUCCESS" },
  warning: { color: "text-chart-3", prefix: "WARN" },
  error: { color: "text-destructive", prefix: "ERROR" },
}

interface LogsTerminalProps {
  logs: LogEntry[]
  className?: string
}

export function LogsTerminal({ logs, className }: LogsTerminalProps) {
  return (
    <div className={cn(
      "rounded-xl border border-border/50 bg-[#0a0f1a] overflow-hidden",
      className
    )}>
      {/* Terminal header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/30 bg-secondary/20">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-destructive/60" />
          <div className="w-3 h-3 rounded-full bg-chart-3/60" />
          <div className="w-3 h-3 rounded-full bg-chart-2/60" />
        </div>
        <span className="text-xs text-muted-foreground font-mono ml-2">
          orquestrador.logs
        </span>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-chart-2 pulse-glow" />
          <span className="text-[10px] text-muted-foreground">LIVE</span>
        </div>
      </div>

      {/* Logs content */}
      <ScrollArea className="h-[300px] flex-1">
        <div className="p-4 font-mono text-xs space-y-1">
          {logs.length === 0 ? (
            <div className="text-muted-foreground">
              $ Aguardando eventos...
            </div>
          ) : (
            [...logs].reverse().map((log, index) => {
              const config = levelConfig[log.level]
              return (
                <div
                  key={log.id}
                  className={cn(
                    "flex items-start gap-2 flow-up",
                    config.color
                  )}
                  style={{ animationDelay: `${Math.min(index, 5) * 0.05}s` }}
                >
                  <span className="text-muted-foreground shrink-0">
                    [{log.timestamp.toLocaleTimeString("pt-BR")}]
                  </span>
                  <span className={cn("shrink-0 w-14", config.color)}>
                    [{config.prefix}]
                  </span>
                  <span className="text-primary">{log.code}</span>
                  {log.message && (
                    <span className="text-muted-foreground">— {log.message}</span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
