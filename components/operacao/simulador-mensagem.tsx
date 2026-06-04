"use client"

import { useState } from "react"
import { Loader2, Zap } from "lucide-react"

const SIMULACOES = [
  "Minha TV é LG",
  "É Samsung",
  "Uso Fire Stick",
  "O app não abre",
  "Lista não carrega",
  "Quero ativar",
  "Já paguei",
]

type Fase = "idle" | "recebendo" | "analisando" | "escolhendo" | "preparando" | "pronto"

const PIPELINE: Array<{ id: Fase; label: string }> = [
  { id: "recebendo", label: "Recebendo mensagem..." },
  { id: "analisando", label: "Analisando intenção..." },
  { id: "escolhendo", label: "Escolhendo fluxo..." },
  { id: "preparando", label: "Preparando resposta..." },
  { id: "pronto", label: "Pronto para enviar" },
]

export function SimuladorMensagem({ onSimulacao }: { onSimulacao?: (msg: string) => void }) {
  const [fase, setFase] = useState<Fase>("idle")
  const [mensagemAtual, setMensagemAtual] = useState<string | null>(null)

  const simular = (msg: string) => {
    setMensagemAtual(msg)
    setFase("recebendo")
    onSimulacao?.(msg)

    const seq: [Fase, number][] = [
      ["analisando", 600],
      ["escolhendo", 700],
      ["preparando", 700],
      ["pronto", 0],
    ]

    let delay = 400
    for (const [f, d] of seq) {
      setTimeout(() => setFase(f), delay)
      delay += d
    }
  }

  const faseIndex = PIPELINE.findIndex((p) => p.id === fase)

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Simulador de Mensagem</h2>
          <p className="text-xs text-muted-foreground">Simule a entrada do cliente</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SIMULACOES.map((msg) => (
          <button
            key={msg}
            onClick={() => simular(msg)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background:
                mensagemAtual === msg && fase !== "idle"
                  ? "oklch(0.58 0.22 255 / 18%)"
                  : "oklch(1 0 0 / 5%)",
              color:
                mensagemAtual === msg && fase !== "idle"
                  ? "oklch(0.58 0.22 255)"
                  : "oklch(0.72 0 240)",
              border: `1px solid ${
                mensagemAtual === msg && fase !== "idle"
                  ? "oklch(0.58 0.22 255 / 35%)"
                  : "oklch(1 0 0 / 10%)"
              }`,
            }}
          >
            &ldquo;{msg}&rdquo;
          </button>
        ))}
      </div>

      {fase !== "idle" && (
        <div className="flex flex-col gap-1.5 fade-in">
          {PIPELINE.map((p, i) => {
            const atual = i === faseIndex
            const concluida = i < faseIndex
            return (
              <div
                key={p.id}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: atual ? "oklch(0.58 0.22 255 / 8%)" : "transparent",
                }}
              >
                {atual ? (
                  <Loader2 className="w-3 h-3 text-primary animate-spin shrink-0" />
                ) : concluida ? (
                  <div className="w-3 h-3 rounded-full bg-[oklch(0.62_0.18_152)] shrink-0" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-muted-foreground/20 shrink-0" />
                )}
                <span
                  className={`text-xs ${
                    atual ? "text-foreground font-medium" : concluida ? "text-muted-foreground" : "text-muted-foreground/30"
                  }`}
                >
                  {p.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {fase === "pronto" && mensagemAtual && (
        <div
          className="rounded-lg px-3 py-2 text-xs fade-in"
          style={{
            background: "oklch(0.62 0.18 152 / 8%)",
            border: "1px solid oklch(0.62 0.18 152 / 20%)",
            color: "oklch(0.62 0.18 152)",
          }}
        >
          Fluxo identificado para: <span className="font-semibold">&ldquo;{mensagemAtual}&rdquo;</span> — resposta preparada.
        </div>
      )}
    </div>
  )
}
