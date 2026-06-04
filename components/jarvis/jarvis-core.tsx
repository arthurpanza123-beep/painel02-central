"use client"

import { cn } from "@/lib/utils"

export type JarvisState = 
  | "idle" 
  | "receiving" 
  | "interpreting" 
  | "detecting" 
  | "preparing" 
  | "executing" 
  | "validating" 
  | "completed" 
  | "failed" 
  | "retry"

interface JarvisCoreProps {
  state: JarvisState
  statusText: string
  activeModule?: string
}

const stateConfig: Record<JarvisState, { label: string; color: string; animation: string }> = {
  idle: { label: "AGUARDANDO", color: "text-primary", animation: "jarvis-breathe" },
  receiving: { label: "RECEBENDO", color: "text-primary", animation: "jarvis-processing" },
  interpreting: { label: "INTERPRETANDO", color: "text-primary", animation: "jarvis-processing" },
  detecting: { label: "DETECTANDO", color: "text-primary", animation: "jarvis-processing" },
  preparing: { label: "PREPARANDO", color: "text-primary", animation: "jarvis-processing" },
  executing: { label: "EXECUTANDO", color: "text-chart-2", animation: "jarvis-processing" },
  validating: { label: "VALIDANDO", color: "text-chart-3", animation: "jarvis-processing" },
  completed: { label: "CONCLUÍDO", color: "text-chart-2", animation: "jarvis-breathe" },
  failed: { label: "FALHA", color: "text-destructive", animation: "jarvis-processing" },
  retry: { label: "RETRY", color: "text-chart-3", animation: "jarvis-processing" },
}

export function JarvisCore({ state, statusText, activeModule }: JarvisCoreProps) {
  const config = stateConfig[state]
  const isProcessing = state !== "idle" && state !== "completed"

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer orbital rings */}
      <div className="absolute w-[420px] h-[420px] rounded-full border border-primary/10 orbit-ring-slow" />
      <div className="absolute w-[380px] h-[380px] rounded-full border border-primary/15 orbit-ring-reverse" />
      <div className="absolute w-[340px] h-[340px] rounded-full border border-primary/20 orbit-ring" />
      
      {/* Energy particles on orbits */}
      <div className="absolute w-[420px] h-[420px] orbit-ring-slow">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary/60 rounded-full particle-pulse" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary/40 rounded-full particle-pulse" style={{ animationDelay: "0.5s" }} />
      </div>
      <div className="absolute w-[380px] h-[380px] orbit-ring-reverse">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-2 h-2 bg-primary/50 rounded-full particle-pulse" style={{ animationDelay: "0.3s" }} />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1.5 h-1.5 bg-primary/40 rounded-full particle-pulse" style={{ animationDelay: "0.8s" }} />
      </div>
      <div className="absolute w-[340px] h-[340px] orbit-ring">
        <div className="absolute top-0 right-1/4 w-1.5 h-1.5 bg-primary/50 rounded-full particle-pulse" style={{ animationDelay: "0.2s" }} />
        <div className="absolute bottom-0 left-1/4 w-2 h-2 bg-primary/60 rounded-full particle-pulse" style={{ animationDelay: "0.7s" }} />
      </div>

      {/* Inner glow ring */}
      <div className={cn(
        "absolute w-[280px] h-[280px] rounded-full",
        "bg-gradient-to-br from-primary/20 via-transparent to-primary/10",
        isProcessing ? "orbit-ring-fast" : "orbit-ring-slow"
      )} />

      {/* Core orb */}
      <div className={cn(
        "relative w-[220px] h-[220px] rounded-full",
        "bg-gradient-to-br from-background via-card to-background",
        "border-2 border-primary/30",
        "flex flex-col items-center justify-center",
        config.animation
      )}>
        {/* Inner gradient overlay */}
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        
        {/* Scanning line effect when processing */}
        {isProcessing && (
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent scanning"
              style={{ backgroundSize: "200% 100%" }}
            />
          </div>
        )}

        {/* Core content */}
        <div className="relative z-10 text-center px-4">
          <div className={cn("text-[10px] font-mono tracking-[0.3em] mb-1", config.color)}>
            {config.label}
          </div>
          <div className="text-xs text-muted-foreground max-w-[160px] leading-relaxed">
            {statusText}
          </div>
          {activeModule && (
            <div className="mt-2 text-[10px] font-mono text-primary/80 tracking-wider">
              [{activeModule.toUpperCase()}]
            </div>
          )}
        </div>

        {/* Corner accents */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t border-l border-primary/40 rounded-tl-lg" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t border-r border-primary/40 rounded-tr-lg" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b border-l border-primary/40 rounded-bl-lg" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b border-r border-primary/40 rounded-br-lg" />
      </div>

      {/* Title below core */}
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center">
        <h1 className="text-lg font-semibold tracking-[0.15em] text-primary text-glow">
          JARVIS CENTRAL PLAY
        </h1>
        <p className="text-[10px] text-muted-foreground tracking-[0.2em] mt-1">
          ORQUESTRADOR AO VIVO
        </p>
      </div>

      {/* Floating particles around */}
      <div className="absolute -top-8 -left-8 w-1 h-1 bg-primary/40 rounded-full particle-float" />
      <div className="absolute -top-4 right-12 w-1.5 h-1.5 bg-primary/30 rounded-full particle-float" style={{ animationDelay: "1s" }} />
      <div className="absolute top-12 -right-6 w-1 h-1 bg-primary/50 rounded-full particle-float" style={{ animationDelay: "2s" }} />
      <div className="absolute -bottom-6 left-8 w-1.5 h-1.5 bg-primary/40 rounded-full particle-float" style={{ animationDelay: "1.5s" }} />
      <div className="absolute bottom-16 -left-10 w-1 h-1 bg-primary/30 rounded-full particle-float" style={{ animationDelay: "0.5s" }} />
    </div>
  )
}
