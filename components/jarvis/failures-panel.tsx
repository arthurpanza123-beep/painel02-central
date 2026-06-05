"use client"

import { cn } from "@/lib/utils"
import { AlertTriangle, RefreshCw, SkipForward, CheckCircle, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface FailureEntry {
  id: string
  text: string
  timestamp: Date
  retryCount: number
}

interface FailuresPanelProps {
  failures: FailureEntry[]
  onRetry: (id: string) => void
  onSkip: (id: string) => void
  onResolve: (id: string) => void
}

export function FailuresPanel({ failures, onRetry, onSkip, onResolve }: FailuresPanelProps) {
  if (failures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-8 text-center">
        <CheckCircle className="w-8 h-8 text-chart-2 mb-3" />
        <p className="text-sm text-muted-foreground">Nenhuma falha ativa</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Sistema operando normalmente</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-destructive/20 bg-destructive/5">
        <AlertTriangle className="w-4 h-4 text-destructive" />
        <span className="text-xs font-semibold tracking-wider text-destructive">FALHAS ATIVAS</span>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-destructive/20 text-destructive text-[10px] font-mono">
          {failures.length}
        </span>
      </div>

      {/* Failures list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {failures.map((failure, index) => (
          <div
            key={failure.id}
            className={cn(
              "p-3 rounded-lg bg-destructive/5 border border-destructive/20 flow-up"
            )}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <p className="text-sm text-foreground">{failure.text}</p>
                <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                  {failure.timestamp.toLocaleTimeString("pt-BR")} · {failure.retryCount} tentativas
                </p>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-chart-3/50 text-chart-3 hover:bg-chart-3/10"
                onClick={() => onRetry(failure.id)}
              >
                <RefreshCw className="w-3 h-3" />
                Retry
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-muted-foreground/30 text-muted-foreground hover:bg-secondary"
                onClick={() => onSkip(failure.id)}
              >
                <SkipForward className="w-3 h-3" />
                Pular
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1.5 border-chart-2/50 text-chart-2 hover:bg-chart-2/10"
                onClick={() => onResolve(failure.id)}
              >
                <CheckCircle className="w-3 h-3" />
                Resolvido
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground ml-auto"
              >
                <Eye className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
