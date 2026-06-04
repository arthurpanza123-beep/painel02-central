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
      {/* Outer orbital rings - elegant glow */}
      <div className="absolute w-[520px] h-[520px] rounded-full border border-primary/15 orbit-ring-slow" />
      <div className="absolute w-[460px] h-[460px] rounded-full border border-primary/20 orbit-ring-reverse" />
      <div className="absolute w-[400px] h-[400px] rounded-full border border-primary/25 orbit-ring" />
      
      {/* Energy particles on orbits */}
      <div className="absolute w-[520px] h-[520px] orbit-ring-slow">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-primary/70 rounded-full particle-pulse glow-blue-sm" />
      </div>
      <div className="absolute w-[460px] h-[460px] orbit-ring-reverse">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-2 h-2 bg-chart-5/60 rounded-full particle-pulse" style={{ animationDelay: "0.5s" }} />
      </div>
      <div className="absolute w-[400px] h-[400px] orbit-ring">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary/60 rounded-full particle-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Inner glow gradient ring */}
      <div className={cn(
        "absolute w-[340px] h-[340px] rounded-full",
        "bg-gradient-to-br from-primary/20 via-chart-5/10 to-primary/15",
        isProcessing ? "orbit-ring-fast" : "orbit-ring-slow"
      )} />

      {/* Core orb - premium card style */}
      <div className={cn(
        "relative w-[280px] h-[280px] rounded-full",
        "bg-gradient-to-br from-card via-secondary to-card",
        "border border-primary/40",
        "flex flex-col items-center justify-center",
        config.animation
      )}>
        {/* Inner gradient overlay - more depth */}
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/8 via-transparent to-chart-5/10" />
        
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
        <div className="relative z-10 text-center px-8">
          <div className={cn("text-sm font-semibold tracking-[0.35em] mb-3", config.color)}>
            {config.label}
          </div>
          <div className="text-sm text-foreground/70 max-w-[200px] leading-relaxed">
            {statusText}
          </div>
          {activeModule && (
            <div className="mt-4 text-xs font-mono text-primary tracking-wider">
              [{activeModule.toUpperCase()}]
            </div>
          )}
        </div>

        {/* Corner accents - more visible */}
        <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-primary/50 rounded-tl-xl" />
        <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-primary/50 rounded-tr-xl" />
        <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-primary/50 rounded-bl-xl" />
        <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-primary/50 rounded-br-xl" />
      </div>

      {/* Title below core */}
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 text-center">
        <h1 className="text-xl font-bold tracking-[0.25em] text-primary text-glow">
          JARVIS
        </h1>
        <p className="text-xs text-muted-foreground tracking-[0.15em] mt-2">
          CENTRAL PLAY
        </p>
      </div>
    </div>
  )
}
