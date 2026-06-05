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
      {/* Outer orbital rings - refined elegance */}
      <div className="absolute w-[500px] h-[500px] rounded-full border border-primary/10 orbit-ring-slow" />
      <div className="absolute w-[440px] h-[440px] rounded-full border border-primary/15 orbit-ring-reverse" />
      <div className="absolute w-[380px] h-[380px] rounded-full border border-primary/20 orbit-ring" />
      
      {/* Energy particles on orbits - more refined */}
      <div className="absolute w-[500px] h-[500px] orbit-ring-slow">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary rounded-full particle-pulse glow-blue-sm" />
      </div>
      <div className="absolute w-[440px] h-[440px] orbit-ring-reverse">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-1.5 h-1.5 bg-chart-5/80 rounded-full particle-pulse" style={{ animationDelay: "0.7s" }} />
      </div>
      <div className="absolute w-[380px] h-[380px] orbit-ring">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary/80 rounded-full particle-pulse" style={{ animationDelay: "1.4s" }} />
      </div>

      {/* Inner glow gradient ring - softer */}
      <div className={cn(
        "absolute w-[320px] h-[320px] rounded-full",
        "bg-gradient-to-br from-primary/12 via-chart-5/6 to-primary/10",
        isProcessing ? "orbit-ring-fast" : "orbit-ring-slow"
      )} />

      {/* Core orb - premium refined style */}
      <div className={cn(
        "relative w-[260px] h-[260px] rounded-full",
        "bg-gradient-to-br from-card via-secondary/80 to-card",
        "border border-primary/30",
        "flex flex-col items-center justify-center",
        config.animation
      )}>
        {/* Inner gradient overlay - subtle depth */}
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-primary/5 via-transparent to-chart-5/5" />
        
        {/* Scanning line effect when processing */}
        {isProcessing && (
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/15 to-transparent scanning"
              style={{ backgroundSize: "200% 100%" }}
            />
          </div>
        )}

        {/* Core content - refined typography */}
        <div className="relative z-10 text-center px-8">
          <div className={cn("text-[13px] font-bold tracking-[0.3em] mb-3", config.color)}>
            {config.label}
          </div>
          <div className="text-[13px] text-foreground/75 max-w-[180px] leading-relaxed">
            {statusText}
          </div>
          {activeModule && (
            <div className="mt-4 text-[11px] font-mono text-primary/90 tracking-widest">
              [{activeModule.toUpperCase()}]
            </div>
          )}
        </div>

        {/* Corner accents - refined */}
        <div className="absolute top-5 left-5 w-6 h-6 border-t-[1.5px] border-l-[1.5px] border-primary/40 rounded-tl-lg" />
        <div className="absolute top-5 right-5 w-6 h-6 border-t-[1.5px] border-r-[1.5px] border-primary/40 rounded-tr-lg" />
        <div className="absolute bottom-5 left-5 w-6 h-6 border-b-[1.5px] border-l-[1.5px] border-primary/40 rounded-bl-lg" />
        <div className="absolute bottom-5 right-5 w-6 h-6 border-b-[1.5px] border-r-[1.5px] border-primary/40 rounded-br-lg" />
      </div>

      {/* Title below core - refined */}
      <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 text-center">
        <h1 className="text-lg font-bold tracking-[0.2em] text-primary text-glow">
          JARVIS
        </h1>
        <p className="text-[10px] text-muted-foreground/80 tracking-[0.15em] mt-1.5 font-medium">
          CENTRAL PLAY
        </p>
      </div>
    </div>
  )
}
