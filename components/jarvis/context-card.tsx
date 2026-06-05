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
      <div className="p-5 bg-card/60 rounded-xl border border-border/50 h-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-secondary/60">
            <User className="w-3.5 h-3.5 text-muted-foreground/60" />
          </div>
          <span className="text-sm font-semibold text-muted-foreground/70">Contexto</span>
        </div>
        <p className="text-sm text-muted-foreground/50 text-center py-8">
          —
        </p>
      </div>
    )
  }

  return (
    <div className="p-5 bg-card/60 rounded-xl border border-border/50 h-full">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
          <User className="w-3.5 h-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground/90">Contexto</span>
      </div>
      
      <div className="space-y-3.5">
        <div>
          <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">Cliente</span>
          <p className="text-[13px] text-foreground/90 mt-0.5">{context.name}</p>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">Aparelho</span>
          <p className="text-[13px] text-foreground/90 mt-0.5">{context.device}</p>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground/70 uppercase tracking-wider font-medium">Fluxo</span>
          <p className="text-[13px] text-primary font-medium mt-0.5">{context.currentFlow}</p>
        </div>
      </div>
    </div>
  )
}

export type { ClientContext }
