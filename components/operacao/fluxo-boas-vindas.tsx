"use client"

import { useState } from "react"
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
  RotateCcw,
  SkipForward,
  Copy,
  CheckCheck,
  Mic,
  Image,
  HelpCircle,
} from "lucide-react"

type Status = "aguardando" | "enviando" | "enviado" | "falhou" | "reenviado" | "concluido"

interface Etapa {
  id: string
  label: string
  tipo: "audio" | "imagem" | "pergunta"
  status: Status
}

const ETAPAS_INICIAIS: Etapa[] = [
  { id: "audio1", label: "Áudio 1 — Boas-vindas", tipo: "audio", status: "concluido" },
  { id: "audio2", label: "Áudio 2 — Explicação", tipo: "audio", status: "concluido" },
  { id: "imagem3", label: "Imagem — Prova social", tipo: "imagem", status: "concluido" },
  { id: "audio4", label: "Áudio 4 — Pergunta do aparelho", tipo: "audio", status: "falhou" },
  { id: "aguarda", label: "Aguardando resposta do cliente", tipo: "pergunta", status: "aguardando" },
]

const statusConfig: Record<
  Status,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  aguardando: {
    label: "Aguardando",
    color: "oklch(0.72 0.18 55)",
    bg: "oklch(0.72 0.18 55 / 8%)",
    border: "oklch(0.72 0.18 55 / 25%)",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  enviando: {
    label: "Enviando",
    color: "oklch(0.58 0.22 255)",
    bg: "oklch(0.58 0.22 255 / 10%)",
    border: "oklch(0.58 0.22 255 / 30%)",
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  },
  enviado: {
    label: "Enviado",
    color: "oklch(0.62 0.18 152)",
    bg: "oklch(0.62 0.18 152 / 8%)",
    border: "oklch(0.62 0.18 152 / 25%)",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  falhou: {
    label: "Falhou",
    color: "oklch(0.63 0.22 25)",
    bg: "oklch(0.63 0.22 25 / 10%)",
    border: "oklch(0.63 0.22 25 / 35%)",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
  reenviado: {
    label: "Reenviado",
    color: "oklch(0.72 0.18 55)",
    bg: "oklch(0.72 0.18 55 / 8%)",
    border: "oklch(0.72 0.18 55 / 25%)",
    icon: <RotateCcw className="w-3.5 h-3.5" />,
  },
  concluido: {
    label: "Concluído",
    color: "oklch(0.62 0.18 152)",
    bg: "oklch(0.62 0.18 152 / 6%)",
    border: "oklch(0.62 0.18 152 / 15%)",
    icon: <CheckCheck className="w-3.5 h-3.5" />,
  },
}

const tipoIcon = {
  audio: <Mic className="w-3.5 h-3.5" />,
  imagem: <Image className="w-3.5 h-3.5" />,
  pergunta: <HelpCircle className="w-3.5 h-3.5" />,
}

export function FluxoBoasVindas() {
  const [etapas, setEtapas] = useState<Etapa[]>(ETAPAS_INICIAIS)
  const [reenviando, setReenviando] = useState<string | null>(null)

  const reenviar = (id: string) => {
    setReenviando(id)
    setEtapas((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "enviando" } : e))
    )
    setTimeout(() => {
      setEtapas((prev) =>
        prev.map((e) => (e.id === id ? { ...e, status: "reenviado" } : e))
      )
      setReenviando(null)
    }, 1800)
  }

  const pular = (id: string) => {
    setEtapas((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "concluido" } : e))
    )
  }

  const concluir = (id: string) => {
    setEtapas((prev) =>
      prev.map((e) => (e.id === id ? { ...e, status: "concluido" } : e))
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Fluxo de Boas-Vindas</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Etapas do bot de recepção</p>
      </div>

      <div className="flex flex-col gap-2">
        {etapas.map((etapa, i) => {
          const cfg = statusConfig[etapa.status]
          const falhou = etapa.status === "falhou"

          return (
            <div
              key={etapa.id}
              className="rounded-lg border transition-all duration-300 fade-in"
              style={{ background: cfg.bg, borderColor: cfg.border }}
            >
              <div className="flex items-center gap-3 px-3 py-2.5">
                {/* Número */}
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: `${cfg.color} / 20%`, color: cfg.color }}
                >
                  {i + 1}
                </span>

                {/* Tipo */}
                <span style={{ color: cfg.color }}>{tipoIcon[etapa.tipo]}</span>

                {/* Label */}
                <span className="flex-1 text-sm text-foreground">{etapa.label}</span>

                {/* Status badge */}
                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ background: `${cfg.color} / 12%`, color: cfg.color }}
                >
                  {cfg.icon}
                  {cfg.label}
                </div>
              </div>

              {/* Ações rápidas se falhou */}
              {falhou && (
                <div className="flex items-center gap-2 px-3 pb-2.5 pt-0.5">
                  <button
                    onClick={() => reenviar(etapa.id)}
                    disabled={reenviando === etapa.id}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                    style={{
                      background: "oklch(0.63 0.22 25 / 15%)",
                      color: "oklch(0.63 0.22 25)",
                      border: "1px solid oklch(0.63 0.22 25 / 30%)",
                    }}
                  >
                    {reenviando === etapa.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3 h-3" />
                    )}
                    Reenviar
                  </button>
                  <button
                    onClick={() => pular(etapa.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                    style={{
                      background: "oklch(0.52 0.02 240 / 20%)",
                      color: "oklch(0.72 0 240)",
                      border: "1px solid oklch(0.52 0.02 240 / 30%)",
                    }}
                  >
                    <SkipForward className="w-3 h-3" />
                    Pular
                  </button>
                  <button
                    onClick={() => {}}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                    style={{
                      background: "oklch(0.52 0.02 240 / 20%)",
                      color: "oklch(0.72 0 240)",
                      border: "1px solid oklch(0.52 0.02 240 / 30%)",
                    }}
                  >
                    <Copy className="w-3 h-3" />
                    Copiar fallback
                  </button>
                  <button
                    onClick={() => concluir(etapa.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                    style={{
                      background: "oklch(0.62 0.18 152 / 12%)",
                      color: "oklch(0.62 0.18 152)",
                      border: "1px solid oklch(0.62 0.18 152 / 25%)",
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Concluir
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
