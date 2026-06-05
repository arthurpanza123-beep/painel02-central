"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Radio, Wifi, Clock } from "lucide-react"

export function Header() {
  const [time, setTime] = useState("")

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(
        now.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      )
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      {/* Esquerda */}
      <div className="flex items-center gap-4">
        <a
          href="https://painel.centralplayplus.com.br"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Gestão</span>
        </a>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[oklch(0.62_0.18_152)] pulse-dot" />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Origem: Painel Gestão / Teste #0001
          </span>
        </div>
      </div>

      {/* Centro */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground tracking-wide">
            Operação em Tempo Real
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          Fluxos, mensagens e automações ao vivo
        </span>
      </div>

      {/* Direita */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Wifi className="w-3.5 h-3.5 text-[oklch(0.62_0.18_152)]" />
          <span className="text-xs">Conectado</span>
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-xs font-mono">{time}</span>
        </div>
      </div>
    </header>
  )
}
