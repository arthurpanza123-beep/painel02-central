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
    <div className="flex flex-col h-full bg-background/90 backdrop-blur-sm border border-border/30 rounded-2xl overflow-hidden">
      {/* Header - cleaner */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30 bg-secondary/20">
        <Terminal className="w-4 h-4 text-primary/70" />
        <span className="text-xs font-mono tracking-wider text-primary/60">CONSOLE</span>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-chart-2/80 pulse-dot" />
        </div>
      </div>

      {/* Logs - more space */}
      <ScrollArea className="flex-1">
        <div className="p-5 font-mono text-xs space-y-2">
          {logs.length === 0 ? (
            <div className="text-muted-foreground/50">
              <span className="text-primary/50">$</span> aguardando...
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
                    <span className={cn("shrink-0 w-10", config.color)}>
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
