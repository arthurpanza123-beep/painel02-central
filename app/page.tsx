"use client"

import { useState } from "react"
import { Header } from "@/components/operacao/header"
import { ConsoleCliente, type ClienteInfo } from "@/components/operacao/console-cliente"
import { CentralAoVivo } from "@/components/operacao/central-ao-vivo"
import { FluxoBoasVindas } from "@/components/operacao/fluxo-boas-vindas"
import { FluxoInstalacao } from "@/components/operacao/fluxo-instalacao"
import { SimuladorMensagem } from "@/components/operacao/simulador-mensagem"
import { Timeline } from "@/components/operacao/timeline"
import { LogsAoVivo } from "@/components/operacao/logs-ao-vivo"
import { AcoesRapidas } from "@/components/operacao/acoes-rapidas"
import { Activity, Workflow, Terminal, Zap } from "lucide-react"

const TABS = [
  { id: "central", label: "Central ao Vivo", icon: <Activity className="w-3.5 h-3.5" /> },
  { id: "fluxos", label: "Fluxos", icon: <Workflow className="w-3.5 h-3.5" /> },
  { id: "logs", label: "Logs & Timeline", icon: <Terminal className="w-3.5 h-3.5" /> },
  { id: "acoes", label: "Ações Rápidas", icon: <Zap className="w-3.5 h-3.5" /> },
] as const

type TabId = (typeof TABS)[number]["id"]

const CLIENTE_INICIAL: ClienteInfo = {
  nome: "João Silva",
  telefone: "(22) 99999-1234",
  app: "XCloud",
  aparelho: "LG",
  status: "aguardando instalação",
  fluxo: "Boas-Vindas",
  etapaAtual: "Pergunta de aparelho",
  testeVinculado: "Teste #0001",
  ultimaMensagemRecebida: "TV LG",
  ultimaMensagemEnviada: "Instruções de instalação LG enviadas.",
}

export default function OperacaoPage() {
  const [tab, setTab] = useState<TabId>("central")
  const [cliente, setCliente] = useState<ClienteInfo>(CLIENTE_INICIAL)

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Header />

      <main className="flex gap-5 p-5 max-w-[1600px] mx-auto items-start">
        {/* Coluna principal */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Tabs */}
          <nav className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 justify-center"
                style={{
                  background: tab === t.id ? "oklch(0.58 0.22 255 / 15%)" : "transparent",
                  color: tab === t.id ? "oklch(0.58 0.22 255)" : "oklch(0.52 0.02 240)",
                  border: `1px solid ${tab === t.id ? "oklch(0.58 0.22 255 / 25%)" : "transparent"}`,
                }}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>

          {/* Conteúdo da tab */}
          {tab === "central" && (
            <div className="flex flex-col gap-4 fade-in">
              <CentralAoVivo />
              <SimuladorMensagem
                onSimulacao={(msg) => {
                  const lower = msg.toLowerCase()
                  if (lower.includes("samsung")) {
                    setCliente((c) => ({ ...c, aparelho: "Samsung", ultimaMensagemRecebida: msg }))
                  } else if (lower.includes("fire") || lower.includes("stick")) {
                    setCliente((c) => ({ ...c, aparelho: "Fire Stick / Mi Stick", ultimaMensagemRecebida: msg }))
                  } else if (lower.includes("lg") || lower.includes("tv")) {
                    setCliente((c) => ({ ...c, aparelho: "LG", ultimaMensagemRecebida: msg }))
                  } else {
                    setCliente((c) => ({ ...c, ultimaMensagemRecebida: msg }))
                  }
                }}
              />
            </div>
          )}

          {tab === "fluxos" && (
            <div className="flex flex-col gap-4 fade-in">
              <FluxoBoasVindas />
              <FluxoInstalacao
                onAparelhoDetectado={(ap) =>
                  setCliente((c) => ({
                    ...c,
                    aparelho: ap,
                    status: "aguardando instalação",
                    etapaAtual: "Instrução de instalação",
                    ultimaMensagemRecebida: ap,
                  }))
                }
              />
            </div>
          )}

          {tab === "logs" && (
            <div className="flex flex-col gap-4 fade-in">
              <Timeline />
              <LogsAoVivo />
            </div>
          )}

          {tab === "acoes" && (
            <div className="fade-in">
              <AcoesRapidas />
            </div>
          )}
        </div>

        {/* Console lateral */}
        <ConsoleCliente cliente={cliente} />
      </main>
    </div>
  )
}
