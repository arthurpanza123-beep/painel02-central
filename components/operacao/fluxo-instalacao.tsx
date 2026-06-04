"use client"

import { useState } from "react"
import {
  Loader2,
  CheckCircle2,
  MonitorSmartphone,
  Send,
  Copy,
  RotateCcw,
  CheckCheck,
  Tv2,
  Smartphone,
  Flame,
} from "lucide-react"

const APARELHOS = [
  "Samsung",
  "LG",
  "Roku",
  "Android TV / Google TV / TCL",
  "TV Box",
  "Fire Stick / Mi Stick",
  "Celular Android",
  "iPhone / iOS",
  "PC",
]

const MENSAGENS_INSTALACAO: Record<string, string> = {
  Samsung: "Acesse a Smart Hub → Apps → Buscar → Digite o nome do app → Instalar. Após instalar, abra e insira: Servidor: [SERVIDOR] | Usuário: [USER] | Senha: [SENHA]",
  LG: "Vá em LG Content Store → Apps → Buscar → Digite o nome → Instalar. Após instalar, abra e acesse: Servidor: [SERVIDOR] | Usuário: [USER] | Senha: [SENHA]",
  Roku: "Acesse streaming.roku.com no celular, busque o canal e instale. Abra o app e insira as credenciais: [SERVIDOR] | [USER] | [SENHA]",
  "Android TV / Google TV / TCL": "Abra a Play Store → Busque o app → Instale. Configure: URL: [SERVIDOR] | Usuário: [USER] | Senha: [SENHA]",
  "TV Box": "Baixe via APK ou Play Store. Configure: URL: [SERVIDOR] | Usuário: [USER] | Senha: [SENHA]",
  "Fire Stick / Mi Stick": "Ative apps de fontes desconhecidas → Use Downloader → Insira o link do APK. Configure com: [SERVIDOR] | [USER] | [SENHA]",
  "Celular Android": "Baixe na Play Store ou via APK. Abra e configure: URL: [SERVIDOR] | Usuário: [USER] | Senha: [SENHA]",
  "iPhone / iOS": "Baixe via TestFlight ou App Store (quando disponível). Configure: URL: [SERVIDOR] | Usuário: [USER] | Senha: [SENHA]",
  PC: "Acesse o site ou baixe o app desktop. Configure: URL: [SERVIDOR] | Usuário: [USER] | Senha: [SENHA]",
}

type Fase = "idle" | "recebido" | "identificando" | "detectado" | "buscando" | "preparando" | "pronto"

export function FluxoInstalacao({ onAparelhoDetectado }: { onAparelhoDetectado?: (a: string) => void }) {
  const [aparelhoSelecionado, setAparelhoSelecionado] = useState<string | null>(null)
  const [fase, setFase] = useState<Fase>("idle")
  const [copiado, setCopiado] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const simular = (aparelho: string) => {
    setAparelhoSelecionado(aparelho)
    setFase("recebido")
    setEnviado(false)
    onAparelhoDetectado?.(aparelho)

    const fases: [Fase, number][] = [
      ["identificando", 700],
      ["detectado", 600],
      ["buscando", 800],
      ["preparando", 700],
      ["pronto", 0],
    ]

    let delay = 300
    for (const [f, dur] of fases) {
      setTimeout(() => setFase(f), delay)
      delay += dur
    }
  }

  const copiar = () => {
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  const enviar = () => {
    setEnviado(true)
    setTimeout(() => {}, 1500)
  }

  const trocar = () => {
    setFase("idle")
    setAparelhoSelecionado(null)
    setEnviado(false)
  }

  const fasesInfo: Array<{ id: Fase; label: string }> = [
    { id: "recebido", label: "Mensagem recebida" },
    { id: "identificando", label: "Identificando aparelho..." },
    { id: "detectado", label: `Aparelho detectado: ${aparelhoSelecionado ?? ""}` },
    { id: "buscando", label: "Buscando instrução correta..." },
    { id: "preparando", label: "Preparando resposta..." },
    { id: "pronto", label: "Pronto para enviar" },
  ]

  const faseIndex = fasesInfo.findIndex((f) => f.id === fase)

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Fluxo de Instalação</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Simule a resposta do cliente para gerar instrução</p>
      </div>

      {/* Seletor de aparelho */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 uppercase tracking-widest">Cliente respondeu com:</p>
        <div className="flex flex-wrap gap-2">
          {APARELHOS.map((ap) => (
            <button
              key={ap}
              onClick={() => simular(ap)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background:
                  aparelhoSelecionado === ap
                    ? "oklch(0.58 0.22 255 / 20%)"
                    : "oklch(1 0 0 / 5%)",
                color:
                  aparelhoSelecionado === ap
                    ? "oklch(0.58 0.22 255)"
                    : "oklch(0.72 0 240)",
                border: `1px solid ${
                  aparelhoSelecionado === ap
                    ? "oklch(0.58 0.22 255 / 35%)"
                    : "oklch(1 0 0 / 10%)"
                }`,
              }}
            >
              {ap}
            </button>
          ))}
        </div>
      </div>

      {/* Pipeline de fases */}
      {fase !== "idle" && (
        <div className="flex flex-col gap-1.5 fade-in">
          {fasesInfo.map((f, i) => {
            const atual = i === faseIndex
            const concluida = i < faseIndex
            const pendente = i > faseIndex

            return (
              <div
                key={f.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-300"
                style={{
                  background: atual
                    ? "oklch(0.58 0.22 255 / 10%)"
                    : concluida
                    ? "oklch(0.62 0.18 152 / 6%)"
                    : "transparent",
                  border: `1px solid ${
                    atual
                      ? "oklch(0.58 0.22 255 / 25%)"
                      : concluida
                      ? "oklch(0.62 0.18 152 / 15%)"
                      : "transparent"
                  }`,
                }}
              >
                {atual ? (
                  <Loader2 className="w-3.5 h-3.5 text-primary animate-spin shrink-0" />
                ) : concluida ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[oklch(0.62_0.18_152)] shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/20 shrink-0" />
                )}
                <span
                  className={`text-sm ${
                    atual
                      ? "text-foreground font-medium"
                      : concluida
                      ? "text-muted-foreground"
                      : "text-muted-foreground/40"
                  }`}
                >
                  {f.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview da mensagem */}
      {fase === "pronto" && aparelhoSelecionado && (
        <div className="flex flex-col gap-3 fade-in">
          <div className="h-px bg-border" />
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Preview da instrução</p>
          <div
            className="rounded-lg p-3 text-sm text-foreground leading-relaxed font-mono"
            style={{
              background: "oklch(0.58 0.22 255 / 6%)",
              border: "1px solid oklch(0.58 0.22 255 / 20%)",
            }}
          >
            {MENSAGENS_INSTALACAO[aparelhoSelecionado]}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!enviado ? (
              <button
                onClick={enviar}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: "oklch(0.58 0.22 255 / 20%)",
                  color: "oklch(0.58 0.22 255)",
                  border: "1px solid oklch(0.58 0.22 255 / 30%)",
                }}
              >
                <Send className="w-3 h-3" />
                Enviar instalação (mock)
              </button>
            ) : (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{
                  background: "oklch(0.62 0.18 152 / 12%)",
                  color: "oklch(0.62 0.18 152)",
                  border: "1px solid oklch(0.62 0.18 152 / 25%)",
                }}
              >
                <CheckCheck className="w-3 h-3" />
                Enviado (mock)
              </div>
            )}
            <button
              onClick={copiar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: "oklch(1 0 0 / 5%)",
                color: "oklch(0.72 0 240)",
                border: "1px solid oklch(1 0 0 / 10%)",
              }}
            >
              {copiado ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copiado ? "Copiado" : "Copiar"}
            </button>
            <button
              onClick={trocar}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: "oklch(1 0 0 / 5%)",
                color: "oklch(0.72 0 240)",
                border: "1px solid oklch(1 0 0 / 10%)",
              }}
            >
              <RotateCcw className="w-3 h-3" />
              Trocar aparelho
            </button>
            <button
              onClick={() => setEnviado(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: "oklch(0.62 0.18 152 / 8%)",
                color: "oklch(0.62 0.18 152)",
                border: "1px solid oklch(0.62 0.18 152 / 20%)",
              }}
            >
              <CheckCircle2 className="w-3 h-3" />
              Marcar como resolvido
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
