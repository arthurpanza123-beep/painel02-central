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
      <div className="p-6 bg-secondary/20 rounded-2xl border border-border/30 h-full">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-4 h-4 text-muted-foreground/50" />
          <span className="text-xs font-medium tracking-wider text-muted-foreground/50">CONTEXTO</span>
        </div>
        <p className="text-sm text-muted-foreground/40 text-center py-6">
          —
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-secondary/20 rounded-2xl border border-border/30 h-full">
      <div className="flex items-center gap-3 mb-5">
        <User className="w-4 h-4 text-primary/70" />
        <span className="text-xs font-medium tracking-wider text-primary/60">CONTEXTO</span>
      </div>
      
      <div className="space-y-4">
        <div>
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Cliente</span>
          <p className="text-sm text-foreground mt-1">{context.name}</p>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Aparelho</span>
          <p className="text-sm text-foreground mt-1">{context.device}</p>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider">Fluxo</span>
          <p className="text-sm text-primary mt-1">{context.currentFlow}</p>
        </div>
      </div>
    </div>
  )
}

export type { ClientContext }
