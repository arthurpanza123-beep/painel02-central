"use client"

import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

interface OrbState {
  status: "idle" | "receiving" | "interpreting" | "classifying" | "routing" | "executing" | "validating" | "success" | "failed" | "retrying"
  message?: string
}

const statusConfig = {
  idle: { label: "Aguardando", color: "text-muted-foreground", glow: "glow-blue-sm" },
  receiving: { label: "Recebendo evento", color: "text-primary", glow: "glow-blue" },
  interpreting: { label: "Interpretando", color: "text-primary", glow: "glow-blue" },
  classifying: { label: "Classificando", color: "text-primary", glow: "glow-blue" },
  routing: { label: "Escolhendo fluxo", color: "text-primary", glow: "glow-blue-intense" },
  executing: { label: "Executando", color: "text-chart-2", glow: "glow-green" },
  validating: { label: "Validando retorno", color: "text-chart-3", glow: "glow-yellow" },
  success: { label: "Concluído", color: "text-chart-2", glow: "glow-green" },
  failed: { label: "Falhou", color: "text-destructive", glow: "glow-red" },
  retrying: { label: "Reenviando", color: "text-chart-3", glow: "glow-yellow" },
}

interface OrquestradorOrbProps {
  state: OrbState
  className?: string
}

export function OrquestradorOrb({ state, className }: OrquestradorOrbProps) {
  const config = statusConfig[state.status]
  const isActive = state.status !== "idle"

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Outer orbital rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={cn(
          "absolute w-[340px] h-[340px] rounded-full border border-primary/10",
          isActive && "orbit-ring"
        )}>
          {/* Orbital particles */}
          {[0, 90, 180, 270].map((deg) => (
            <div
              key={deg}
              className="absolute w-2 h-2 bg-primary/40 rounded-full"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${deg}deg) translateX(170px) translateY(-50%)`,
              }}
            />
          ))}
        </div>
        <div className={cn(
          "absolute w-[280px] h-[280px] rounded-full border border-primary/15",
          isActive && "orbit-ring-reverse"
        )}>
          {[45, 135, 225, 315].map((deg) => (
            <div
              key={deg}
              className="absolute w-1.5 h-1.5 bg-primary/30 rounded-full"
              style={{
                top: "50%",
                left: "50%",
                transform: `rotate(${deg}deg) translateX(140px) translateY(-50%)`,
              }}
            />
          ))}
        </div>
        <div className={cn(
          "absolute w-[220px] h-[220px] rounded-full border border-primary/20",
          isActive && "orbit-ring-slow"
        )} />
      </div>

      {/* Main orb */}
      <div
        className={cn(
          "relative w-44 h-44 rounded-full flex items-center justify-center",
          "bg-gradient-to-br from-primary/20 via-primary/10 to-transparent",
          "border border-primary/30",
          isActive ? config.glow : "glow-blue-sm",
          isActive && "orb-pulse"
        )}
      >
        {/* Inner core */}
        <div className={cn(
          "w-28 h-28 rounded-full flex flex-col items-center justify-center",
          "bg-gradient-to-br from-card via-card/80 to-secondary/50",
          "border border-primary/40"
        )}>
          {/* Pulsing center dot */}
          <div className={cn(
            "w-4 h-4 rounded-full mb-2",
            state.status === "idle" ? "bg-muted-foreground/50" : "bg-primary",
            isActive && "pulse-glow"
          )} />
          
          {/* Status text */}
          <span className={cn("text-[10px] font-medium uppercase tracking-wider", config.color)}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Floating particles when active */}
      {isActive && (
        <>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-primary/50 rounded-full particle-float"
              style={{
                top: `${30 + Math.random() * 40}%`,
                left: `${30 + Math.random() * 40}%`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}

// Estado e mensagem abaixo do orb
export function OrquestradorStatus({ state }: { state: OrbState }) {
  return (
    <div className="text-center mt-6 space-y-1">
      <h2 className="text-lg font-semibold text-foreground">Orquestrador Central</h2>
      <p className="text-xs text-muted-foreground">
        Recebe eventos, interpreta contexto e dispara fluxos
      </p>
      {state.message && (
        <p className="text-sm text-primary mt-2 font-mono flow-up">
          {state.message}
        </p>
      )}
    </div>
  )
}
