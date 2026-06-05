"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Tv, 
  CreditCard, 
  AlertTriangle, 
  Zap, 
  HelpCircle, 
  TestTube,
  FileAudio,
  Play
} from "lucide-react"

interface SimuladorEventosProps {
  onSimular: (tipo: string, mensagem: string) => void
  isSimulating?: boolean
  className?: string
}

const eventos = [
  { tipo: "dispositivo", mensagem: "Cliente respondeu: TV LG", icon: Tv, color: "text-primary" },
  { tipo: "pagamento", mensagem: "Cliente respondeu: Já paguei", icon: CreditCard, color: "text-chart-2" },
  { tipo: "audio_falhou", mensagem: "Áudio 4 falhou no envio", icon: FileAudio, color: "text-destructive" },
  { tipo: "teste", mensagem: "Teste #0001 gerado", icon: TestTube, color: "text-chart-2" },
  { tipo: "ativacao", mensagem: "Cliente pediu: Quero ativar", icon: Zap, color: "text-primary" },
  { tipo: "problema", mensagem: "Cliente relatou: Lista não carrega", icon: HelpCircle, color: "text-chart-3" },
]

export function SimuladorEventos({ onSimular, isSimulating, className }: SimuladorEventosProps) {
  return (
    <div className={cn("p-4 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm", className)}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Play className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
          Simulador de Eventos
        </h3>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Clique para simular eventos entrando no orquestrador
      </p>

      {/* Event buttons */}
      <div className="grid grid-cols-2 gap-2">
        {eventos.map((evento) => {
          const Icon = evento.icon
          return (
            <Button
              key={evento.tipo + evento.mensagem}
              variant="outline"
              size="sm"
              disabled={isSimulating}
              onClick={() => onSimular(evento.tipo, evento.mensagem)}
              className={cn(
                "h-auto py-2.5 px-3 justify-start gap-2 text-left",
                "border-border/50 bg-secondary/30 hover:bg-secondary/50",
                "hover:border-primary/30 transition-all duration-200",
                isSimulating && "opacity-50"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", evento.color)} />
              <span className="text-[11px] text-foreground truncate">
                {evento.mensagem.replace("Cliente respondeu: ", "").replace("Cliente relatou: ", "").replace("Cliente pediu: ", "")}
              </span>
            </Button>
          )
        })}
      </div>

      {/* Simulating indicator */}
      {isSimulating && (
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-primary">
          <div className="w-2 h-2 rounded-full bg-primary pulse-dot" />
          Processando evento...
        </div>
      )}
    </div>
  )
}
