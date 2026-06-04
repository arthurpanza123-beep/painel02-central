"use client"

import { useState } from "react"
import {
  MessageSquare,
  Mic,
  Image,
  HelpCircle,
  CheckCircle2,
  Phone,
  MonitorSmartphone,
  Send,
  Plus,
} from "lucide-react"

interface Evento {
  id: string
  hora: string
  descricao: string
  status: "ok" | "falhou" | "aguardando"
  icone: React.ReactNode
}

const EVENTOS_INICIAIS: Evento[] = [
  { id: "e1", hora: "14:32", descricao: "Cliente chamou no WhatsApp", status: "ok", icone: <Phone className="w-3.5 h-3.5" /> },
  { id: "e2", hora: "14:32", descricao: "Boas-vindas enviada", status: "ok", icone: <Mic className="w-3.5 h-3.5" /> },
  { id: "e3", hora: "14:33", descricao: "Explicação enviada", status: "ok", icone: <Mic className="w-3.5 h-3.5" /> },
  { id: "e4", hora: "14:33", descricao: "Prova social enviada", status: "ok", icone: <Image className="w-3.5 h-3.5" /> },
  { id: "e5", hora: "14:34", descricao: "Áudio 4 — Falhou", status: "falhou", icone: <Mic className="w-3.5 h-3.5" /> },
  { id: "e6", hora: "14:34", descricao: "Áudio 4 — Reenviado", status: "ok", icone: <Mic className="w-3.5 h-3.5" /> },
  { id: "e7", hora: "14:35", descricao: "Pergunta de aparelho enviada", status: "ok", icone: <HelpCircle className="w-3.5 h-3.5" /> },
  { id: "e8", hora: "14:36", descricao: 'Cliente respondeu: "TV LG"', status: "ok", icone: <MessageSquare className="w-3.5 h-3.5" /> },
  { id: "e9", hora: "14:36", descricao: "Instalação preparada para LG", status: "ok", icone: <MonitorSmartphone className="w-3.5 h-3.5" /> },
  { id: "e10", hora: "14:37", descricao: "Instalação enviada (mock)", status: "aguardando", icone: <Send className="w-3.5 h-3.5" /> },
]

const statusDot: Record<string, string> = {
  ok: "bg-[oklch(0.62_0.18_152)]",
  falhou: "bg-[oklch(0.63_0.22_25)]",
  aguardando: "bg-[oklch(0.72_0.18_55)] pulse-dot",
}

export function Timeline({ eventosExtras }: { eventosExtras?: Evento[] }) {
  const todos = [...EVENTOS_INICIAIS, ...(eventosExtras ?? [])]

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-foreground">Timeline do Atendimento</h2>

      <div className="relative flex flex-col gap-0">
        {todos.map((ev, i) => (
          <div key={ev.id} className="flex gap-3 relative slide-in" style={{ animationDelay: `${i * 30}ms` }}>
            {/* Linha vertical */}
            <div className="flex flex-col items-center">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${statusDot[ev.status]}`} />
              {i < todos.length - 1 && (
                <div className="w-px flex-1 bg-border mt-0.5 mb-0.5" style={{ minHeight: 16 }} />
              )}
            </div>

            {/* Conteúdo */}
            <div className="pb-3 flex items-start gap-2 flex-1">
              <span className="text-[10px] font-mono text-muted-foreground shrink-0 mt-0.5">{ev.hora}</span>
              <div className="flex items-center gap-1.5">
                <span style={{ color: ev.status === "falhou" ? "oklch(0.63 0.22 25)" : "oklch(0.52 0.02 240)" }}>
                  {ev.icone}
                </span>
                <span
                  className="text-xs"
                  style={{
                    color:
                      ev.status === "falhou"
                        ? "oklch(0.63 0.22 25)"
                        : ev.status === "aguardando"
                        ? "oklch(0.72 0.18 55)"
                        : "oklch(0.85 0.01 220)",
                  }}
                >
                  {ev.descricao}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
