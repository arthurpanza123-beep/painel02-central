"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Tv, 
  TestTube, 
  Volume2, 
  CreditCard, 
  Power, 
  List,
  Zap
} from "lucide-react"

interface Simulation {
  id: string
  label: string
  icon: React.ReactNode
  type: "device" | "test" | "failure" | "payment" | "request" | "audio"
}

interface SimulatorPanelProps {
  onSimulate: (simulation: Simulation) => void
  disabled?: boolean
}

const simulations: Simulation[] = [
  { id: "tv-lg", label: "TV LG", icon: <Tv className="w-4 h-4" />, type: "device" },
  { id: "teste-gerado", label: "Teste gerado", icon: <TestTube className="w-4 h-4" />, type: "test" },
  { id: "audio-falhou", label: "Áudio 4 falhou", icon: <Volume2 className="w-4 h-4" />, type: "audio" },
  { id: "ja-paguei", label: "Já paguei", icon: <CreditCard className="w-4 h-4" />, type: "payment" },
  { id: "quero-ativar", label: "Quero ativar", icon: <Power className="w-4 h-4" />, type: "request" },
  { id: "lista-nao-carrega", label: "Lista não carrega", icon: <List className="w-4 h-4" />, type: "failure" },
]

export function SimulatorPanel({ onSimulate, disabled }: SimulatorPanelProps) {
  return (
    <div className="flex flex-col gap-3 p-4 bg-secondary/30 rounded-xl border border-border/50">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold tracking-wider text-primary">SIMULAR EVENTO</span>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {simulations.map((sim) => (
          <Button
            key={sim.id}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onSimulate(sim)}
            className={cn(
              "h-auto py-2.5 px-3 flex flex-col items-center gap-1.5",
              "border-primary/20 hover:border-primary/50 hover:bg-primary/5",
              "transition-all duration-200",
              disabled && "opacity-50"
            )}
          >
            <span className="text-primary">{sim.icon}</span>
            <span className="text-[10px] font-medium text-foreground">{sim.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}

export type { Simulation }
