"use client"

import { cn } from "@/lib/utils"
import { Send, MessageCircle, Image, FileAudio, CreditCard, HelpCircle, RotateCcw } from "lucide-react"

export interface AcaoSaida {
  id: string
  tipo: "audio" | "imagem" | "mensagem" | "instalacao" | "cobranca" | "reenvio"
  descricao: string
  timestamp: Date
  status: "dispatching" | "sent" | "failed"
}

const tipoConfig = {
  audio: { icon: FileAudio, color: "text-primary", bg: "bg-primary/10" },
  imagem: { icon: Image, color: "text-chart-2", bg: "bg-chart-2/10" },
  mensagem: { icon: MessageCircle, color: "text-foreground", bg: "bg-secondary" },
  instalacao: { icon: HelpCircle, color: "text-chart-3", bg: "bg-chart-3/10" },
  cobranca: { icon: CreditCard, color: "text-chart-2", bg: "bg-chart-2/10" },
  reenvio: { icon: RotateCcw, color: "text-chart-3", bg: "bg-chart-3/10" },
}

interface SaidasPanelProps {
  acoes: AcaoSaida[]
  className?: string
}

export function SaidasPanel({ acoes, className }: SaidasPanelProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Send className="w-4 h-4 text-chart-2" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Saídas
        </h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {acoes.filter(a => a.status === "dispatching").length} enviando
        </span>
      </div>

      {/* Actions list */}
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {acoes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma ação disparada
          </div>
        ) : (
          acoes.map((acao, index) => {
            const config = tipoConfig[acao.tipo]
            const Icon = config.icon
            
            return (
              <div
                key={acao.id}
                className={cn(
                  "group relative p-3 rounded-lg border transition-all duration-300",
                  "bg-card/50 border-border/50 hover:border-chart-2/30",
                  acao.status === "dispatching" && "flow-out border-chart-2/40 glow-green",
                  acao.status === "sent" && "opacity-60",
                  acao.status === "failed" && "border-destructive/40 glow-red"
                )}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Connection line from center */}
                {acao.status === "dispatching" && (
                  <div className="absolute left-0 top-1/2 w-4 h-px bg-gradient-to-l from-chart-2/60 to-transparent" />
                )}

                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-md", config.bg)}>
                    <Icon className={cn("w-4 h-4", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {acao.descricao}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                      {acao.timestamp.toLocaleTimeString("pt-BR")}
                    </p>
                  </div>
                </div>

                {/* Status indicator */}
                <div className={cn(
                  "absolute top-2 right-2 w-1.5 h-1.5 rounded-full",
                  acao.status === "dispatching" && "bg-chart-2 pulse-dot",
                  acao.status === "sent" && "bg-chart-2",
                  acao.status === "failed" && "bg-destructive pulse-glow"
                )} />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
