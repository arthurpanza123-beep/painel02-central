"use client"

import { cn } from "@/lib/utils"
import { User, Phone, Smartphone, MapPin, Activity } from "lucide-react"

interface ClientContext {
  name: string
  phone: string
  app: string
  device: string
  origin: string
  currentFlow: string
}

interface ContextCardProps {
  context: ClientContext | null
}

export function ContextCard({ context }: ContextCardProps) {
  if (!context) {
    return (
      <div className="p-4 bg-secondary/30 rounded-xl border border-border/50">
        <div className="flex items-center gap-2 mb-3">
          <User className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold tracking-wider text-muted-foreground">CONTEXTO ATUAL</span>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum contexto ativo
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 bg-secondary/30 rounded-xl border border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-primary" />
        <span className="text-xs font-semibold tracking-wider text-primary">CONTEXTO ATUAL</span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <User className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Cliente:</span>
          <span className="text-xs text-foreground">{context.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Telefone:</span>
          <span className="text-xs text-foreground font-mono">{context.phone}</span>
        </div>
        <div className="flex items-center gap-2">
          <Smartphone className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">App:</span>
          <span className="text-xs text-foreground">{context.app}</span>
        </div>
        <div className="flex items-center gap-2">
          <Smartphone className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Aparelho:</span>
          <span className="text-xs text-foreground">{context.device}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Origem:</span>
          <span className="text-xs text-foreground">{context.origin}</span>
        </div>
        <div className="flex items-center gap-2 pt-2 border-t border-border/50 mt-2">
          <Activity className="w-3 h-3 text-primary" />
          <span className="text-xs text-muted-foreground">Fluxo:</span>
          <span className="text-xs text-primary font-medium">{context.currentFlow}</span>
        </div>
      </div>
    </div>
  )
}

export type { ClientContext }
