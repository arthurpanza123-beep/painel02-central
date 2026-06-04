"use client"

import { cn } from "@/lib/utils"
import { Terminal } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface LogEntry {
  id: string
  timestamp: Date
  code: string
  level: "info" | "success" | "warning" | "error"
  message?: string
}

interface TerminalConsoleProps {
  logs: LogEntry[]
  commandInput?: string
  onCommandChange?: (value: string) => void
  onCommandSubmit?: () => void
}

const levelConfig: Record<LogEntry["level"], { prefix: string; color: string }> = {
  info: { prefix: "INFO", color: "text-primary" },
  success: { prefix: "OK", color: "text-chart-2" },
  warning: { prefix: "WARN", color: "text-chart-3" },
  error: { prefix: "ERR", color: "text-destructive" },
}

export function TerminalConsole({ logs, commandInput = "", onCommandChange, onCommandSubmit }: TerminalConsoleProps) {
  return (
    <div className="flex flex-col h-full bg-card/60 border border-border/50 rounded-xl overflow-hidden">
      {/* Header - refined */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/40 bg-secondary/20">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <Terminal className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground/90">Console</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-chart-2 pulse-dot glow-green" />
        </div>
      </div>

      {/* Logs - refined */}
      <ScrollArea className="flex-1">
        <div className="p-4 font-mono text-xs space-y-1.5">
          {logs.length === 0 ? (
            <div className="text-muted-foreground/50">
              <span className="text-primary/60">$</span> aguardando...
            </div>
          ) : (
            <>
              {[...logs].reverse().map((log, index) => {
                const config = levelConfig[log.level]
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 terminal-line"
                    style={{ animationDelay: `${Math.min(index, 10) * 0.03}s` }}
                  >
                    <span className={cn("shrink-0 w-11 font-semibold opacity-90", config.color)}>
                      {config.prefix}
                    </span>
                    <span className="text-foreground/80">{log.code}</span>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
