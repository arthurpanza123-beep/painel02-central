"use client"

import { cn } from "@/lib/utils"
import { XCircle, RotateCcw, SkipForward, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface Falha {
  id: string
  fluxo: string
  etapa: string
  erro: string
  timestamp: Date
  tentativas: number
}

interface FalhasRetryProps {
  falhas: Falha[]
  onRetry?: (falha: Falha) => void
  onSkip?: (falha: Falha) => void
  onMarcarConcluido?: (falha: Falha) => void
  className?: string
}

export function FalhasRetry({ falhas, onRetry, onSkip, onMarcarConcluido, className }: FalhasRetryProps) {
  return (
    <div className={cn("", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-destructive" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Falhas & Retry
          </h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {falhas.length} falha{falhas.length !== 1 ? "s" : ""} pendente{falhas.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Failures list */}
      <div className="space-y-3">
        {falhas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border/50 rounded-lg">
            Nenhuma falha registrada
          </div>
        ) : (
          falhas.map((falha) => (
            <div
              key={falha.id}
              className={cn(
                "p-4 rounded-lg border transition-all duration-300",
                "bg-destructive/5 border-destructive/30 glow-red"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-foreground">
                      {falha.fluxo}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/20 text-destructive">
                      {falha.tentativas} tentativa{falha.tentativas !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    Etapa: <span className="text-foreground">{falha.etapa}</span>
                  </p>
                  <p className="text-xs text-destructive font-mono">
                    {falha.erro}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-2 font-mono">
                    {falha.timestamp.toLocaleTimeString("pt-BR")}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px] border-chart-3/50 text-chart-3 hover:bg-chart-3/10"
                    onClick={() => onRetry?.(falha)}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px] border-muted-foreground/50 text-muted-foreground hover:bg-secondary"
                    onClick={() => onSkip?.(falha)}
                  >
                    <SkipForward className="w-3 h-3 mr-1" />
                    Pular
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-[11px] border-chart-2/50 text-chart-2 hover:bg-chart-2/10"
                    onClick={() => onMarcarConcluido?.(falha)}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Concluído
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
