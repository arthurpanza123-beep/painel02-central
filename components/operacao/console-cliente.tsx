"use client"

import { User, Phone, MonitorSmartphone, Tv2, Activity, MessageCircle } from "lucide-react"

export interface ClienteInfo {
  nome: string
  telefone: string
  app: string
  aparelho: string
  status: string
  fluxo: string
  ultimaMensagemRecebida: string
  ultimaMensagemEnviada: string
  etapaAtual: string
  testeVinculado: string
}

interface ConsoleClienteProps {
  cliente: ClienteInfo
}

const statusColors: Record<string, string> = {
  "aguardando instalação": "text-[oklch(0.72_0.18_55)]",
  "em atendimento": "text-[oklch(0.58_0.22_255)]",
  "resolvido": "text-[oklch(0.62_0.18_152)]",
  "falhou": "text-[oklch(0.63_0.22_25)]",
}

export function ConsoleCliente({ cliente }: ConsoleClienteProps) {
  const statusClass = statusColors[cliente.status] ?? "text-muted-foreground"

  return (
    <aside className="w-72 shrink-0 bg-card border border-border rounded-xl p-4 flex flex-col gap-4 h-fit">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground leading-tight">{cliente.nome}</p>
          <p className="text-xs text-muted-foreground">Console do Cliente</p>
        </div>
      </div>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-2.5">
        <Row icon={<Phone className="w-3.5 h-3.5" />} label="WhatsApp" value={cliente.telefone} />
        <Row icon={<Tv2 className="w-3.5 h-3.5" />} label="App" value={cliente.app} />
        <Row icon={<MonitorSmartphone className="w-3.5 h-3.5" />} label="Aparelho" value={cliente.aparelho} />
        <Row icon={<Activity className="w-3.5 h-3.5" />} label="Etapa atual" value={cliente.etapaAtual} />
        <Row icon={<Activity className="w-3.5 h-3.5" />} label="Teste vinculado" value={cliente.testeVinculado} />
      </div>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Status</p>
        <p className={`text-sm font-semibold capitalize ${statusClass}`}>{cliente.status}</p>
        <p className="text-xs text-muted-foreground">Fluxo: {cliente.fluxo}</p>
      </div>

      <div className="h-px bg-border" />

      <div className="flex flex-col gap-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Última mensagem</p>
        <div className="bg-secondary/60 rounded-lg p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <MessageCircle className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Recebida</span>
          </div>
          <p className="text-xs text-foreground">{cliente.ultimaMensagemRecebida}</p>
        </div>
        <div className="bg-primary/10 rounded-lg p-2.5">
          <div className="flex items-center gap-1 mb-1">
            <MessageCircle className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-primary">Enviada</span>
          </div>
          <p className="text-xs text-foreground">{cliente.ultimaMensagemEnviada}</p>
        </div>
      </div>
    </aside>
  )
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs font-medium text-foreground text-right truncate max-w-[120px]">{value}</span>
    </div>
  )
}
