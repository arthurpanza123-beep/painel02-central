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
      <div className="p-6 bg-gradient-to-br from-card to-secondary/50 rounded-2xl border border-border h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-secondary/80">
            <User className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-semibold text-muted-foreground">Contexto</span>
        </div>
        <p className="text-sm text-muted-foreground text-center py-6">
          —
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 bg-gradient-to-br from-card to-secondary/50 rounded-2xl border border-border h-full">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-lg bg-primary/15">
          <User className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground">Contexto</span>
      </div>
      
      <div className="space-y-4">
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Cliente</span>
          <p className="text-sm text-foreground mt-1">{context.name}</p>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Aparelho</span>
          <p className="text-sm text-foreground mt-1">{context.device}</p>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Fluxo</span>
          <p className="text-sm text-primary font-medium mt-1">{context.currentFlow}</p>
        </div>
      </div>
    </div>
  )
}

export type { ClientContext }
