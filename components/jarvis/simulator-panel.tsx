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
    <div className="flex flex-col gap-5 p-6 bg-gradient-to-br from-card to-secondary/50 rounded-2xl border border-border h-full">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/15">
          <Zap className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">Simular</span>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        {simulations.map((sim) => (
          <Button
            key={sim.id}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onSimulate(sim)}
            className={cn(
              "h-auto py-4 px-4 flex flex-col items-center gap-2.5",
              "bg-secondary/50 border-border hover:border-primary/60 hover:bg-primary/10",
              "transition-all duration-200 rounded-xl",
              disabled && "opacity-50"
            )}
          >
            <span className="text-primary">{sim.icon}</span>
            <span className="text-xs font-medium text-foreground">{sim.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}

export type { Simulation }
