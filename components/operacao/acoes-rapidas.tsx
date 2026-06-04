"use client"

import { useState } from "react"
import {
  RotateCcw,
  Send,
  Mic,
  CreditCard,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from "lucide-react"

interface Acao {
  id: string
  label: string
  icon: React.ReactNode
  cor: string
  corBg: string
  corBorder: string
}

const ACOES: Acao[] = [
  {
    id: "reenviar_ultima",
    label: "Reenviar última mensagem",
    icon: <RotateCcw className="w-3.5 h-3.5" />,
    cor: "oklch(0.58 0.22 255)",
    corBg: "oklch(0.58 0.22 255 / 12%)",
    corBorder: "oklch(0.58 0.22 255 / 25%)",
  },
  {
    id: "reenviar_midia",
    label: "Reenviar mídia que falhou",
    icon: <RotateCcw className="w-3.5 h-3.5" />,
    cor: "oklch(0.63 0.22 25)",
    corBg: "oklch(0.63 0.22 25 / 10%)",
    corBorder: "oklch(0.63 0.22 25 / 25%)",
  },
  {
    id: "enviar_instalacao",
    label: "Enviar instalação",
    icon: <Send className="w-3.5 h-3.5" />,
    cor: "oklch(0.58 0.22 255)",
    corBg: "oklch(0.58 0.22 255 / 12%)",
    corBorder: "oklch(0.58 0.22 255 / 25%)",
  },
  {
    id: "enviar_teste",
    label: "Enviar teste",
    icon: <Send className="w-3.5 h-3.5" />,
    cor: "oklch(0.72 0.18 55)",
    corBg: "oklch(0.72 0.18 55 / 10%)",
    corBorder: "oklch(0.72 0.18 55 / 25%)",
  },
  {
    id: "enviar_cobranca",
    label: "Enviar cobrança",
    icon: <CreditCard className="w-3.5 h-3.5" />,
    cor: "oklch(0.72 0.18 55)",
    corBg: "oklch(0.72 0.18 55 / 10%)",
    corBorder: "oklch(0.72 0.18 55 / 25%)",
  },
  {
    id: "audio_boas_vindas",
    label: "Áudio de boas-vindas",
    icon: <Mic className="w-3.5 h-3.5" />,
    cor: "oklch(0.58 0.22 255)",
    corBg: "oklch(0.58 0.22 255 / 12%)",
    corBorder: "oklch(0.58 0.22 255 / 25%)",
  },
  {
    id: "marcar_resolvido",
    label: "Marcar como resolvido",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    cor: "oklch(0.62 0.18 152)",
    corBg: "oklch(0.62 0.18 152 / 10%)",
    corBorder: "oklch(0.62 0.18 152 / 25%)",
  },
  {
    id: "abrir_whatsapp",
    label: "Abrir WhatsApp",
    icon: <ExternalLink className="w-3.5 h-3.5" />,
    cor: "oklch(0.62 0.18 152)",
    corBg: "oklch(0.62 0.18 152 / 10%)",
    corBorder: "oklch(0.62 0.18 152 / 25%)",
  },
]

export function AcoesRapidas() {
  const [loading, setLoading] = useState<string | null>(null)
  const [feito, setFeito] = useState<Set<string>>(new Set())

  const executar = (id: string) => {
    if (id === "marcar_resolvido") {
      setFeito((prev) => new Set([...prev, id]))
      return
    }
    setLoading(id)
    setTimeout(() => {
      setLoading(null)
      if (id !== "abrir_whatsapp") {
        setFeito((prev) => new Set([...prev, id]))
        setTimeout(() => {
          setFeito((prev) => {
            const n = new Set(prev)
            n.delete(id)
            return n
          })
        }, 2500)
      }
    }, 1200)
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Ações Rápidas</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Tudo mockado — nenhum envio real</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ACOES.map((acao) => {
          const isLoading = loading === acao.id
          const isDone = feito.has(acao.id)

          return (
            <button
              key={acao.id}
              onClick={() => executar(acao.id)}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-all"
              style={{
                background: isDone ? "oklch(0.62 0.18 152 / 10%)" : acao.corBg,
                color: isDone ? "oklch(0.62 0.18 152)" : acao.cor,
                border: `1px solid ${isDone ? "oklch(0.62 0.18 152 / 25%)" : acao.corBorder}`,
              }}
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : isDone ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <span className="shrink-0">{acao.icon}</span>
              )}
              {isDone ? "Enviado" : acao.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
