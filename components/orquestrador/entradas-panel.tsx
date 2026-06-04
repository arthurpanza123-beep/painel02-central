"use client"

import { cn } from "@/lib/utils"
import { MessageSquare, CreditCard, Wrench, AlertTriangle, CheckCircle, Zap } from "lucide-react"

export interface EventoEntrada {
  id: string
  tipo: "dispositivo" | "pagamento" | "problema" | "teste" | "audio_falhou" | "ativacao"
  mensagem: string
  timestamp: Date
  status: "entering" | "processing" | "processed"
}

const tipoConfig = {
  dispositivo: { icon: MessageSquare, color: "text-primary", bg: "bg-primary/10" },
  pagamento: { icon: CreditCard, color: "text-chart-2", bg: "bg-chart-2/10" },
  problema: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  teste: { icon: CheckCircle, color: "text-chart-2", bg: "bg-chart-2/10" },
  audio_falhou: { icon: AlertTriangle, color: "text-chart-3", bg: "bg-chart-3/10" },
  ativacao: { icon: Zap, color: "text-primary", bg: "bg-primary/10" },
}

interface EntradasPanelProps {
  eventos: EventoEntrada[]
  className?: string
}

export function EntradasPanel({ eventos, className }: EntradasPanelProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-primary pulse-glow" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Entradas
        </h3>
        <span className="text-xs text-muted-foreground ml-auto">
          {eventos.filter(e => e.status === "entering").length} pendentes
        </span>
      </div>

      {/* Events list */}
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {eventos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aguardando eventos...
          </div>
        ) : (
          eventos.map((evento, index) => {
            const config = tipoConfig[evento.tipo]
            const Icon = config.icon
            
            return (
              <div
                key={evento.id}
                className={cn(
                  "group relative p-3 rounded-lg border transition-all duration-300",
                  "bg-card/50 border-border/50 hover:border-primary/30",
                  evento.status === "entering" && "flow-in border-primary/40 glow-blue-sm",
                  evento.status === "processing" && "processing border-primary/60",
                  evento.status === "processed" && "opacity-50"
                )}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Connection line to center */}
                {evento.status === "processing" && (
                  <div className="absolute right-0 top-1/2 w-4 h-px bg-gradient-to-r from-primary/60 to-transparent" />
                )}

                <div className="flex items-start gap-3">
                  <div className={cn("p-2 rounded-md", config.bg)}>
                    <Icon className={cn("w-4 h-4", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {evento.mensagem}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                      {evento.timestamp.toLocaleTimeString("pt-BR")}
                    </p>
                  </div>
                </div>

                {/* Status indicator */}
                <div className={cn(
                  "absolute top-2 right-2 w-1.5 h-1.5 rounded-full",
                  evento.status === "entering" && "bg-primary pulse-dot",
                  evento.status === "processing" && "bg-chart-3 pulse-glow",
                  evento.status === "processed" && "bg-chart-2"
                )} />
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
