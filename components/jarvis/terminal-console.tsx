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
    <div className="flex flex-col h-full bg-background/80 backdrop-blur-sm border border-border/50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-secondary/30">
        <Terminal className="w-4 h-4 text-primary" />
        <span className="text-xs font-mono tracking-wider text-primary">CONSOLE</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-chart-2 pulse-dot" />
          <span className="text-[9px] font-mono text-muted-foreground">LIVE</span>
        </div>
      </div>

      {/* Logs */}
      <ScrollArea className="flex-1">
        <div className="p-4 font-mono text-xs space-y-1">
          {logs.length === 0 ? (
            <div className="text-muted-foreground">
              <span className="text-primary">$</span> Aguardando eventos...
              <span className="terminal-cursor">_</span>
            </div>
          ) : (
            <>
              {[...logs].reverse().map((log, index) => {
                const config = levelConfig[log.level]
                return (
                  <div
                    key={log.id}
                    className={cn("flex items-start gap-2 terminal-line")}
                    style={{ animationDelay: `${Math.min(index, 10) * 0.03}s` }}
                  >
                    <span className="text-muted-foreground shrink-0 w-[70px]">
                      [{log.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}]
                    </span>
                    <span className={cn("shrink-0 w-12", config.color)}>
                      [{config.prefix}]
                    </span>
                    <span className="text-primary">{log.code}</span>
                    {log.message && (
                      <span className="text-muted-foreground">— {log.message}</span>
                    )}
                  </div>
                )
              })}
              <div className="text-muted-foreground mt-2">
                <span className="text-primary">$</span> <span className="terminal-cursor">_</span>
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Command input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border/50 bg-secondary/20">
        <span className="text-primary font-mono text-sm">$</span>
        <input
          type="text"
          value={commandInput}
          onChange={(e) => onCommandChange?.(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onCommandSubmit?.()}
          placeholder="Digite ou simule um evento..."
          className="flex-1 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>
    </div>
  )
}
