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
    <div className="flex flex-col h-full bg-gradient-to-br from-card to-secondary/30 border border-border rounded-2xl overflow-hidden">
      {/* Header - premium */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-secondary/30">
        <div className="p-2 rounded-lg bg-primary/15">
          <Terminal className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">Console</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-chart-2 pulse-dot glow-green" />
        </div>
      </div>

      {/* Logs - premium style */}
      <ScrollArea className="flex-1">
        <div className="p-5 font-mono text-xs space-y-2">
          {logs.length === 0 ? (
            <div className="text-muted-foreground">
              <span className="text-primary">$</span> aguardando...
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
                    <span className={cn("shrink-0 w-12 font-semibold", config.color)}>
                      {config.prefix}
                    </span>
                    <span className="text-foreground">{log.code}</span>
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
