"use client"

import { useState, useEffect } from "react"
import { Loader2, CheckCircle2, AlertCircle, MessageSquare, Mic, Image, Send, Clock } from "lucide-react"

type EstadoAtual =
  | "idle"
  | "recebendo"
  | "interpretando"
  | "identificando"
  | "preparando"
  | "enviando_audio"
  | "enviando_imagem"
  | "aguardando"
  | "concluido"

interface Etapa {
  id: EstadoAtual
  label: string
  icon: React.ReactNode
  duracao: number
}

const ETAPAS: Etapa[] = [
  { id: "recebendo", label: "Recebendo mensagem do cliente", icon: <MessageSquare className="w-4 h-4" />, duracao: 900 },
  { id: "interpretando", label: "Interpretando resposta", icon: <Loader2 className="w-4 h-4" />, duracao: 1100 },
  { id: "identificando", label: "Identificando aparelho", icon: <Loader2 className="w-4 h-4" />, duracao: 800 },
  { id: "preparando", label: "Preparando mensagem", icon: <Loader2 className="w-4 h-4" />, duracao: 700 },
  { id: "enviando_audio", label: "Enviando áudio", icon: <Mic className="w-4 h-4" />, duracao: 1200 },
  { id: "enviando_imagem", label: "Enviando imagem", icon: <Image className="w-4 h-4" />, duracao: 1000 },
  { id: "aguardando", label: "Aguardando resposta", icon: <Clock className="w-4 h-4" />, duracao: 800 },
  { id: "concluido", label: "Concluído", icon: <CheckCircle2 className="w-4 h-4" />, duracao: 0 },
]

export function CentralAoVivo() {
  const [etapaAtual, setEtapaAtual] = useState<number>(-1)
  const [concluidas, setConcluidas] = useState<Set<number>>(new Set())
  const [rodando, setRodando] = useState(false)

  const iniciar = () => {
    setConcluidas(new Set())
    setEtapaAtual(0)
    setRodando(true)
  }

  useEffect(() => {
    if (!rodando || etapaAtual < 0) return
    if (etapaAtual >= ETAPAS.length) {
      setRodando(false)
      return
    }
    const etapa = ETAPAS[etapaAtual]
    const t = setTimeout(() => {
      setConcluidas((prev) => new Set([...prev, etapaAtual]))
      setEtapaAtual((prev) => prev + 1)
    }, etapa.duracao)
    return () => clearTimeout(t)
  }, [etapaAtual, rodando])

  const reset = () => {
    setEtapaAtual(-1)
    setConcluidas(new Set())
    setRodando(false)
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Central ao Vivo</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Acompanhe o que está acontecendo agora</p>
        </div>
        <div className="flex items-center gap-2">
          {rodando && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[oklch(0.62_0.18_152)] pulse-dot" />
              <span className="text-xs text-[oklch(0.62_0.18_152)]">ao vivo</span>
            </div>
          )}
          <button
            onClick={rodando ? reset : iniciar}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: rodando
                ? "oklch(0.63 0.22 25 / 15%)"
                : "oklch(0.58 0.22 255 / 20%)",
              color: rodando ? "oklch(0.63 0.22 25)" : "oklch(0.58 0.22 255)",
              border: `1px solid ${rodando ? "oklch(0.63 0.22 25 / 30%)" : "oklch(0.58 0.22 255 / 30%)"}`,
            }}
          >
            {rodando ? "Parar" : etapaAtual === ETAPAS.length ? "Reiniciar" : "Simular fluxo"}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        {ETAPAS.map((etapa, i) => {
          const ativa = etapaAtual === i && rodando
          const concluida = concluidas.has(i)
          const pendente = !ativa && !concluida

          return (
            <div
              key={etapa.id}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 ${
                ativa
                  ? "bg-primary/10 border border-primary/30 glow-blue-sm"
                  : concluida
                  ? "bg-[oklch(0.62_0.18_152/8%)] border border-[oklch(0.62_0.18_152/20%)]"
                  : "bg-secondary/30 border border-transparent"
              }`}
            >
              <div
                className={`shrink-0 transition-colors ${
                  ativa
                    ? "text-primary"
                    : concluida
                    ? "text-[oklch(0.62_0.18_152)]"
                    : "text-muted-foreground/40"
                }`}
              >
                {ativa ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : concluida ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  etapa.icon
                )}
              </div>
              <span
                className={`text-sm transition-colors ${
                  ativa ? "text-foreground font-medium" : concluida ? "text-foreground/70" : "text-muted-foreground/50"
                }`}
              >
                {etapa.label}
              </span>
              {ativa && (
                <div className="ml-auto flex gap-0.5">
                  {[0, 1, 2].map((d) => (
                    <div
                      key={d}
                      className="w-1 h-1 rounded-full bg-primary"
                      style={{ animation: `pulse-dot 1s ease-in-out ${d * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              )}
              {concluida && (
                <span className="ml-auto text-[10px] text-[oklch(0.62_0.18_152)]">ok</span>
              )}
            </div>
          )
        })}
      </div>

      {etapaAtual === ETAPAS.length && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[oklch(0.62_0.18_152/12%)] border border-[oklch(0.62_0.18_152/30%)] fade-in">
          <CheckCircle2 className="w-4 h-4 text-[oklch(0.62_0.18_152)]" />
          <span className="text-sm text-[oklch(0.62_0.18_152)] font-medium">Fluxo concluído com sucesso</span>
        </div>
      )}
    </div>
  )
}
