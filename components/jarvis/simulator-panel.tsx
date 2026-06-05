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
    <div className="flex flex-col gap-4 p-5 bg-card/60 rounded-xl border border-border/50 h-full">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <Zap className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground/90">Simular</span>
      </div>
      
      <div className="grid grid-cols-3 gap-2.5">
        {simulations.map((sim) => (
          <Button
            key={sim.id}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onSimulate(sim)}
            className={cn(
              "h-auto py-3.5 px-3 flex flex-col items-center gap-2",
              "bg-secondary/40 border-border/50 hover:border-primary/40 hover:bg-primary/5",
              "transition-all duration-200 rounded-lg",
              disabled && "opacity-50"
            )}
          >
            <span className="text-primary/80">{sim.icon}</span>
            <span className="text-[11px] font-medium text-foreground/80">{sim.label}</span>
          </Button>
        ))}
      </div>
    </div>
  )
}

export type { Simulation }
