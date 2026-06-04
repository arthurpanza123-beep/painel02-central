"use client"

import { cn } from "@/lib/utils"
import { 
  MessageSquare, 
  Download, 
  TestTube, 
  CreditCard, 
  Headphones, 
  RefreshCw,
  AlertTriangle,
  Smartphone
} from "lucide-react"

export type ModuleStatus = "ready" | "processing" | "waiting" | "failed" | "retry" | "completed"

interface Module {
  id: string
  name: string
  icon: React.ReactNode
  status: ModuleStatus
  count?: number
}

interface ModulesRingProps {
  modules: Module[]
  activeModuleId?: string
}

const statusColors: Record<ModuleStatus, { bg: string; border: string; text: string; glow: string }> = {
  ready: { bg: "bg-card/80", border: "border-border/60", text: "text-muted-foreground/80", glow: "" },
  processing: { bg: "bg-primary/10", border: "border-primary/60", text: "text-primary", glow: "glow-blue-sm status-active" },
  waiting: { bg: "bg-chart-3/10", border: "border-chart-3/50", text: "text-chart-3/90", glow: "" },
  failed: { bg: "bg-destructive/10", border: "border-destructive/50", text: "text-destructive/90", glow: "glow-red" },
  retry: { bg: "bg-chart-3/10", border: "border-chart-3/60", text: "text-chart-3", glow: "glow-yellow" },
  completed: { bg: "bg-chart-2/10", border: "border-chart-2/50", text: "text-chart-2", glow: "glow-green" },
}

const statusLabels: Record<ModuleStatus, string> = {
  ready: "PRONTO",
  processing: "PROCESSANDO",
  waiting: "AGUARDANDO",
  failed: "FALHOU",
  retry: "RETRY",
  completed: "OK",
}

export function ModulesRing({ modules, activeModuleId }: ModulesRingProps) {
  // Position modules around a circle - refined radius
  const radius = 300
  const startAngle = -90 // Start from top
  const angleStep = 360 / modules.length

  return (
    <div className="absolute inset-0 pointer-events-none">
      {modules.map((module, index) => {
        const angle = startAngle + (index * angleStep)
        const radian = (angle * Math.PI) / 180
        const x = Math.cos(radian) * radius
        const y = Math.sin(radian) * radius
        const isActive = module.id === activeModuleId
        const colors = statusColors[module.status]

        return (
          <div
            key={module.id}
            className="absolute left-1/2 top-1/2 pointer-events-auto"
            style={{
              transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
            }}
          >
            <div
              className={cn(
                "relative flex flex-col items-center gap-2 p-3.5 rounded-xl",
                "border backdrop-blur-sm transition-all duration-300",
                colors.bg,
                colors.border,
                isActive && "scale-110",
                colors.glow
              )}
            >
              <div className={cn("p-2.5 rounded-lg bg-secondary/60", colors.text)}>
                {module.icon}
              </div>
              <span className={cn("text-[11px] font-medium", colors.text)}>
                {module.name}
              </span>
              {module.count !== undefined && module.count > 0 && (
                <span className={cn(
                  "absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] rounded-full",
                  "flex items-center justify-center text-[10px] font-mono",
                  module.status === "failed" ? "bg-destructive text-white" : "bg-primary text-primary-foreground"
                )}>
                  {module.count}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function getDefaultModules(): Module[] {
  return [
    { id: "boas-vindas", name: "Boas-vindas", icon: <MessageSquare className="w-4 h-4" />, status: "ready" },
    { id: "instalacao", name: "Instalação", icon: <Download className="w-4 h-4" />, status: "ready" },
    { id: "teste", name: "Teste", icon: <TestTube className="w-4 h-4" />, status: "ready" },
    { id: "cobranca", name: "Cobrança", icon: <CreditCard className="w-4 h-4" />, status: "ready" },
    { id: "suporte", name: "Suporte", icon: <Headphones className="w-4 h-4" />, status: "ready" },
    { id: "reenvio", name: "Reenvio", icon: <RefreshCw className="w-4 h-4" />, status: "ready" },
    { id: "falhas", name: "Falhas", icon: <AlertTriangle className="w-4 h-4" />, status: "ready" },
    { id: "whatsapp", name: "WhatsApp", icon: <Smartphone className="w-4 h-4" />, status: "ready" },
  ]
}
