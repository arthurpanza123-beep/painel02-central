"use client"

import { cn } from "@/lib/utils"
import { Hand, Wrench, TestTube, CreditCard, LifeBuoy, RotateCcw } from "lucide-react"

export type WorkerStatus = "idle" | "processing" | "waiting" | "success" | "failed" | "retrying"

export interface Worker {
  id: string
  nome: string
  status: WorkerStatus
  icon: "boas-vindas" | "instalacao" | "teste" | "cobranca" | "suporte" | "reenvio"
}

const iconMap = {
  "boas-vindas": Hand,
  "instalacao": Wrench,
  "teste": TestTube,
  "cobranca": CreditCard,
  "suporte": LifeBuoy,
  "reenvio": RotateCcw,
}

const statusConfig: Record<WorkerStatus, { color: string; bg: string; border: string; glow: string }> = {
  idle: { color: "text-muted-foreground", bg: "bg-secondary/50", border: "border-border/50", glow: "" },
  processing: { color: "text-primary", bg: "bg-primary/10", border: "border-primary/50", glow: "glow-blue-sm" },
  waiting: { color: "text-chart-3", bg: "bg-chart-3/10", border: "border-chart-3/50", glow: "glow-yellow" },
  success: { color: "text-chart-2", bg: "bg-chart-2/10", border: "border-chart-2/50", glow: "glow-green" },
  failed: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/50", glow: "glow-red" },
  retrying: { color: "text-chart-3", bg: "bg-chart-3/10", border: "border-chart-3/50", glow: "glow-yellow" },
}

const statusLabels: Record<WorkerStatus, string> = {
  idle: "Ocioso",
  processing: "Processando",
  waiting: "Aguardando",
  success: "Concluído",
  failed: "Falhou",
  retrying: "Retentando",
}

interface WorkerModuleProps {
  worker: Worker
  position: { x: number; y: number }
  onClick?: () => void
}

export function WorkerModule({ worker, position, onClick }: WorkerModuleProps) {
  const Icon = iconMap[worker.icon]
  const config = statusConfig[worker.status]

  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-300",
        "border backdrop-blur-sm hover:scale-105 cursor-pointer",
        config.bg,
        config.border,
        config.glow,
        worker.status === "processing" && "processing",
        worker.status === "retrying" && "processing"
      )}
      style={{
        left: `calc(50% + ${position.x}px)`,
        top: `calc(50% + ${position.y}px)`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Connection line to center */}
      <svg
        className="absolute pointer-events-none"
        style={{
          width: Math.abs(position.x) + 20,
          height: Math.abs(position.y) + 20,
          left: position.x > 0 ? -Math.abs(position.x) : "50%",
          top: position.y > 0 ? -Math.abs(position.y) : "50%",
        }}
      >
        <line
          x1={position.x > 0 ? 0 : "100%"}
          y1={position.y > 0 ? 0 : "100%"}
          x2={position.x > 0 ? "100%" : 0}
          y2={position.y > 0 ? "100%" : 0}
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 4"
          className={cn(
            "text-border/30",
            worker.status === "processing" && "text-primary/50 connection-pulse"
          )}
        />
      </svg>

      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center",
        config.bg,
        "border",
        config.border
      )}>
        <Icon className={cn("w-5 h-5", config.color)} />
      </div>
      
      <span className="text-[10px] font-medium text-foreground whitespace-nowrap">
        {worker.nome}
      </span>
      
      <span className={cn("text-[9px] uppercase tracking-wider", config.color)}>
        {statusLabels[worker.status]}
      </span>

      {/* Status dot */}
      <div className={cn(
        "absolute -top-1 -right-1 w-2 h-2 rounded-full",
        worker.status === "idle" && "bg-muted-foreground/50",
        worker.status === "processing" && "bg-primary pulse-dot",
        worker.status === "waiting" && "bg-chart-3 pulse-glow",
        worker.status === "success" && "bg-chart-2",
        worker.status === "failed" && "bg-destructive pulse-glow",
        worker.status === "retrying" && "bg-chart-3 pulse-dot"
      )} />
    </button>
  )
}

interface WorkersRingProps {
  workers: Worker[]
  onWorkerClick?: (worker: Worker) => void
}

export function WorkersRing({ workers, onWorkerClick }: WorkersRingProps) {
  // Positions around the orb (hexagonal layout)
  const positions = [
    { x: -180, y: -80 },  // Boas-vindas (top-left)
    { x: 0, y: -150 },    // Instalação (top)
    { x: 180, y: -80 },   // Teste (top-right)
    { x: 180, y: 80 },    // Cobrança (bottom-right)
    { x: 0, y: 150 },     // Suporte (bottom)
    { x: -180, y: 80 },   // Reenvio (bottom-left)
  ]

  return (
    <div className="relative w-full h-full">
      {workers.map((worker, index) => (
        <WorkerModule
          key={worker.id}
          worker={worker}
          position={positions[index] || { x: 0, y: 0 }}
          onClick={() => onWorkerClick?.(worker)}
        />
      ))}
    </div>
  )
}
