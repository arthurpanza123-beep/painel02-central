"use client"

import { cn } from "@/lib/utils"
import { Play, Pause, CheckCircle, XCircle, RotateCcw, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

export type ExecucaoStatus = "running" | "success" | "failed" | "waiting" | "retrying"

export interface Execucao {
  id: string
  fluxo: string
  descricao: string
  status: ExecucaoStatus
  progresso?: number
  timestamp: Date
}

const statusConfig: Record<ExecucaoStatus, { icon: typeof Play; color: string; bg: string; label: string }> = {
  running: { icon: Play, color: "text-primary", bg: "bg-primary/10", label: "Rodando" },
  success: { icon: CheckCircle, color: "text-chart-2", bg: "bg-chart-2/10", label: "Concluído" },
  failed: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Falhou" },
  waiting: { icon: Clock, color: "text-chart-3", bg: "bg-chart-3/10", label: "Aguardando" },
  retrying: { icon: RotateCcw, color: "text-chart-3", bg: "bg-chart-3/10", label: "Retentando" },
}

interface FilaExecucoesProps {
  execucoes: Execucao[]
  onRetry?: (execucao: Execucao) => void
  onSkip?: (execucao: Execucao) => void
  className?: string
}

export function FilaExecucoes({ execucoes, onRetry, onSkip, className }: FilaExecucoesProps) {
  return (
    <div className={cn("", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-chart-2 pulse-glow" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
            Fila de Execuções
          </h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {execucoes.filter(e => e.status === "running" || e.status === "retrying").length} ativas
        </span>
      </div>

      {/* Executions grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {execucoes.length === 0 ? (
          <div className="col-span-full text-center py-6 text-muted-foreground text-sm">
            Nenhuma execução ativa
          </div>
        ) : (
          execucoes.map((execucao) => {
            const config = statusConfig[execucao.status]
            const Icon = config.icon
            
            return (
              <div
                key={execucao.id}
                className={cn(
                  "relative p-3 rounded-lg border transition-all duration-300",
                  "bg-card/50 border-border/50 hover:border-primary/20",
                  execucao.status === "running" && "border-primary/30 glow-blue-sm",
                  execucao.status === "failed" && "border-destructive/30 glow-red",
                  execucao.status === "retrying" && "border-chart-3/30 glow-yellow"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-md shrink-0", config.bg)}>
                    <Icon className={cn(
                      "w-4 h-4",
                      config.color,
                      execucao.status === "running" && "animate-pulse",
                      execucao.status === "retrying" && "animate-spin"
                    )} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {execucao.fluxo}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {execucao.descricao}
                    </p>
                    
                    {/* Progress bar for running */}
                    {(execucao.status === "running" || execucao.status === "retrying") && execucao.progresso !== undefined && (
                      <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            execucao.status === "running" ? "bg-primary" : "bg-chart-3"
                          )}
                          style={{ width: `${execucao.progresso}%` }}
                        />
                      </div>
                    )}

                    {/* Actions for failed */}
                    {execucao.status === "failed" && (
                      <div className="flex gap-1.5 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px] border-chart-3/50 text-chart-3 hover:bg-chart-3/10"
                          onClick={() => onRetry?.(execucao)}
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Retry
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px] border-muted-foreground/50 text-muted-foreground hover:bg-secondary"
                          onClick={() => onSkip?.(execucao)}
                        >
                          Pular
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <div className={cn(
                  "absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-medium uppercase",
                  config.bg,
                  config.color
                )}>
                  {config.label}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
