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
      {/* Outer orbital rings - LARGER with more space */}
      <div className="absolute w-[520px] h-[520px] rounded-full border border-primary/8 orbit-ring-slow" />
      <div className="absolute w-[460px] h-[460px] rounded-full border border-primary/12 orbit-ring-reverse" />
      <div className="absolute w-[400px] h-[400px] rounded-full border border-primary/15 orbit-ring" />
      
      {/* Energy particles on orbits - simplified */}
      <div className="absolute w-[520px] h-[520px] orbit-ring-slow">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-primary/50 rounded-full particle-pulse" />
      </div>
      <div className="absolute w-[460px] h-[460px] orbit-ring-reverse">
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-2 h-2 bg-primary/40 rounded-full particle-pulse" style={{ animationDelay: "0.5s" }} />
      </div>
      <div className="absolute w-[400px] h-[400px] orbit-ring">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-primary/50 rounded-full particle-pulse" style={{ animationDelay: "1s" }} />
      </div>

      {/* Inner glow ring */}
      <div className={cn(
        "absolute w-[340px] h-[340px] rounded-full",
        "bg-gradient-to-br from-primary/15 via-transparent to-primary/8",
        isProcessing ? "orbit-ring-fast" : "orbit-ring-slow"
      )} />

      {/* Core orb - MUCH LARGER */}
      <div className={cn(
        "relative w-[280px] h-[280px] rounded-full",
        "bg-gradient-to-br from-background via-card to-background",
        "border-2 border-primary/25",
        "flex flex-col items-center justify-center",
        config.animation
      )}>
        {/* Inner gradient overlay */}
        <div className="absolute inset-3 rounded-full bg-gradient-to-br from-primary/5 via-transparent to-primary/8" />
        
        {/* Scanning line effect when processing */}
        {isProcessing && (
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/15 to-transparent scanning"
              style={{ backgroundSize: "200% 100%" }}
            />
          </div>
        )}

        {/* Core content - simplified */}
        <div className="relative z-10 text-center px-8">
          <div className={cn("text-sm font-mono tracking-[0.4em] mb-3", config.color)}>
            {config.label}
          </div>
          <div className="text-sm text-muted-foreground/80 max-w-[200px] leading-relaxed">
            {statusText}
          </div>
          {activeModule && (
            <div className="mt-4 text-xs font-mono text-primary/70 tracking-wider">
              [{activeModule.toUpperCase()}]
            </div>
          )}
        </div>

        {/* Corner accents - larger and more subtle */}
        <div className="absolute top-6 left-6 w-8 h-8 border-t border-l border-primary/30 rounded-tl-xl" />
        <div className="absolute top-6 right-6 w-8 h-8 border-t border-r border-primary/30 rounded-tr-xl" />
        <div className="absolute bottom-6 left-6 w-8 h-8 border-b border-l border-primary/30 rounded-bl-xl" />
        <div className="absolute bottom-6 right-6 w-8 h-8 border-b border-r border-primary/30 rounded-br-xl" />
      </div>

      {/* Title below core - more breathing room */}
      <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 text-center">
        <h1 className="text-xl font-semibold tracking-[0.2em] text-primary text-glow">
          JARVIS
        </h1>
        <p className="text-xs text-muted-foreground/60 tracking-[0.15em] mt-2">
          CENTRAL PLAY
        </p>
      </div>
    </div>
  )
}
