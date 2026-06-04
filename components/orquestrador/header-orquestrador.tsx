"use client"

import { cn } from "@/lib/utils"
import { Activity, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderOrquestradorProps {
  origem?: string
  onVoltar?: () => void
}

export function HeaderOrquestrador({ origem, onVoltar }: HeaderOrquestradorProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-3">
        {/* Left side */}
        <div className="flex items-center gap-4">
          {onVoltar && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-muted-foreground hover:text-foreground"
              onClick={onVoltar}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Gestão
            </Button>
          )}

          <div className="flex items-center gap-3">
            <div className="relative">
              <Activity className="w-6 h-6 text-primary" />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-chart-2 pulse-glow" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                Orquestrador Central
              </h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                Central Play Plus — Operação em Tempo Real
              </p>
            </div>
          </div>
        </div>

        {/* Right side - Origin */}
        {origem && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Origem:
            </span>
            <span className="text-xs font-mono text-primary">{origem}</span>
          </div>
        )}
      </div>
    </header>
  )
}
