"use client"

import { useState, useCallback, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Activity, AlertTriangle, Terminal, Settings, Zap, Tv, MessageSquare, 
  RefreshCw, CreditCard, Sparkles, HelpCircle, Clock, History, Monitor, BarChart3,
  User, Layers, Play, Pause, CheckCircle2, XCircle, Loader2, ListOrdered
} from "lucide-react"

// Types
type JarvisState = "idle" | "receiving" | "interpreting" | "detecting" | "preparing" | "executing" | "validating" | "completed" | "failed" | "retry"
type LogEntry = { id: string; timestamp: Date; level: "info" | "success" | "warning" | "error"; code: string; detail?: string }
type QueueItem = { id: string; simId: string; label: string; addedAt: Date; status: "queued" | "processing" | "completed" | "failed" }
type FailureEntry = { id: string; timestamp: Date; code: string; message: string; resolved: boolean }

// Flow configurations
const FLOWS: Record<string, { 
  module: string
  states: { state: JarvisState; text: string; duration: number }[]
  logs: { level: LogEntry["level"]; code: string; detail?: string }[]
}> = {
  "tv-lg": {
    module: "Instalacao",
    states: [
      { state: "receiving", text: "Recebendo resposta", duration: 500 },
      { state: "interpreting", text: "Interpretando intent", duration: 600 },
      { state: "detecting", text: "Detectando LG TV", duration: 500 },
      { state: "executing", text: "Preparando instalacao", duration: 700 },
      { state: "completed", text: "Instalacao LG pronta", duration: 2000 },
    ],
    logs: [
      { level: "info", code: "DEVICE_DETECT", detail: "LG Smart TV identificada" },
      { level: "info", code: "INTENT_INSTALL", detail: "Fluxo de instalacao iniciado" },
      { level: "success", code: "DISPATCH_OK", detail: "Instrucoes enviadas com sucesso" },
    ],
  },
  "audio-falhou": {
    module: "Reenvio",
    states: [
      { state: "receiving", text: "Falha detectada", duration: 400 },
      { state: "failed", text: "Audio 4 falhou", duration: 600 },
      { state: "retry", text: "Preparando retry", duration: 500 },
      { state: "executing", text: "Reenviando audio", duration: 600 },
      { state: "completed", text: "Audio 4 reenviado", duration: 2000 },
    ],
    logs: [
      { level: "error", code: "AUDIO_FAIL", detail: "Falha no envio do audio 4" },
      { level: "warning", code: "RETRY_INIT", detail: "Iniciando tentativa de reenvio" },
      { level: "success", code: "AUDIO_SENT", detail: "Audio reenviado com sucesso" },
    ],
  },
  "ja-paguei": {
    module: "Cobranca",
    states: [
      { state: "receiving", text: "Verificando pagamento", duration: 500 },
      { state: "executing", text: "Confirmando status", duration: 600 },
      { state: "completed", text: "Pagamento confirmado", duration: 2000 },
    ],
    logs: [
      { level: "info", code: "PAYMENT_CHECK", detail: "Verificando status do pagamento" },
      { level: "success", code: "PAYMENT_OK", detail: "Pagamento confirmado no sistema" },
    ],
  },
  "quero-ativar": {
    module: "Boas-vindas",
    states: [
      { state: "receiving", text: "Solicitacao recebida", duration: 400 },
      { state: "executing", text: "Iniciando ativacao", duration: 800 },
      { state: "completed", text: "Boas-vindas enviado", duration: 2000 },
    ],
    logs: [
      { level: "info", code: "ACTIVATION", detail: "Nova ativacao solicitada" },
      { level: "success", code: "WELCOME_SENT", detail: "Fluxo de boas-vindas disparado" },
    ],
  },
  "lista-nao-carrega": {
    module: "Suporte",
    states: [
      { state: "receiving", text: "Problema reportado", duration: 400 },
      { state: "executing", text: "Buscando solucao", duration: 700 },
      { state: "completed", text: "Suporte enviado", duration: 2000 },
    ],
    logs: [
      { level: "warning", code: "ISSUE_LIST", detail: "Problema com lista reportado" },
      { level: "success", code: "SUPPORT_SENT", detail: "Instrucoes de suporte enviadas" },
    ],
  },
  "teste-gerado": {
    module: "Teste",
    states: [
      { state: "receiving", text: "Teste iniciado", duration: 400 },
      { state: "executing", text: "Executando teste", duration: 500 },
      { state: "completed", text: "Teste concluido", duration: 2000 },
    ],
    logs: [
      { level: "info", code: "TEST_RUN", detail: "Teste #0001 em execucao" },
      { level: "success", code: "TEST_OK", detail: "Teste finalizado com sucesso" },
    ],
  },
}

// Simulations
const simulations = [
  { id: "tv-lg", label: "TV LG", icon: <Tv className="w-4 h-4" /> },
  { id: "audio-falhou", label: "Audio falhou", icon: <RefreshCw className="w-4 h-4" /> },
  { id: "ja-paguei", label: "Ja paguei", icon: <CreditCard className="w-4 h-4" /> },
  { id: "quero-ativar", label: "Ativar", icon: <Sparkles className="w-4 h-4" /> },
  { id: "lista-nao-carrega", label: "Lista erro", icon: <HelpCircle className="w-4 h-4" /> },
  { id: "teste-gerado", label: "Teste", icon: <MessageSquare className="w-4 h-4" /> },
]

// State config
const stateConfig: Record<JarvisState, { label: string; color: string }> = {
  idle: { label: "AGUARDANDO", color: "text-primary" },
  receiving: { label: "RECEBENDO", color: "text-primary" },
  interpreting: { label: "INTERPRETANDO", color: "text-primary" },
  detecting: { label: "DETECTANDO", color: "text-chart-3" },
  preparing: { label: "PREPARANDO", color: "text-chart-3" },
  executing: { label: "EXECUTANDO", color: "text-chart-2" },
  validating: { label: "VALIDANDO", color: "text-chart-3" },
  completed: { label: "CONCLUIDO", color: "text-chart-2" },
  failed: { label: "FALHA", color: "text-destructive" },
  retry: { label: "RETRY", color: "text-chart-3" },
}

// Sidebar items
const sidebarItems = [
  { id: "central", label: "Central", icon: Activity },
  { id: "falhas", label: "Falhas", icon: AlertTriangle },
  { id: "console", label: "Console", icon: Terminal },
  { id: "historico", label: "Historico", icon: History },
]

export default function JarvisPage() {
  const [activeTab, setActiveTab] = useState("central")
  const [jarvisState, setJarvisState] = useState<JarvisState>("idle")
  const [statusText, setStatusText] = useState("Aguardando evento")
  const [lastEvent, setLastEvent] = useState<{ text: string; time: Date } | null>(null)
  const [currentAction, setCurrentAction] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [context, setContext] = useState<{ name: string; device: string; flow: string } | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [failures, setFailures] = useState<FailureEntry[]>([])
  const [processedCount, setProcessedCount] = useState(0)
  const [history, setHistory] = useState<{ id: string; label: string; module: string; time: Date; success: boolean }[]>([])

  // Add log
  const addLog = useCallback((level: LogEntry["level"], code: string, detail?: string) => {
    setLogs(prev => [{
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      code,
      detail,
    }, ...prev].slice(0, 100))
  }, [])

  // Process queue item
  const processQueueItem = useCallback(async (item: QueueItem) => {
    const flow = FLOWS[item.simId]
    if (!flow) return

    setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: "processing" } : q))
    setIsProcessing(true)
    setLastEvent({ text: item.label, time: new Date() })
    setContext({
      name: "Joao Silva",
      device: item.simId === "tv-lg" ? "LG" : item.simId === "audio-falhou" ? "Samsung" : "—",
      flow: flow.module,
    })

    // Process states
    let logIndex = 0
    let hasFailed = false
    
    for (const step of flow.states) {
      setJarvisState(step.state)
      setStatusText(step.text)
      
      if (step.state === "executing" || step.state === "retry") {
        setCurrentAction(step.text)
      }

      if (step.state === "failed") {
        hasFailed = true
        setFailures(prev => [{
          id: `fail-${Date.now()}`,
          timestamp: new Date(),
          code: flow.logs[logIndex]?.code || "UNKNOWN",
          message: step.text,
          resolved: false,
        }, ...prev].slice(0, 50))
      }

      if (flow.logs[logIndex]) {
        addLog(flow.logs[logIndex].level, flow.logs[logIndex].code, flow.logs[logIndex].detail)
        logIndex++
      }

      await new Promise(r => setTimeout(r, step.duration))
    }

    // Complete item
    setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: hasFailed ? "failed" : "completed" } : q))
    setHistory(prev => [{
      id: `hist-${Date.now()}`,
      label: item.label,
      module: flow.module,
      time: new Date(),
      success: !hasFailed,
    }, ...prev].slice(0, 50))
    setProcessedCount(prev => prev + 1)

    // Wait before next
    await new Promise(r => setTimeout(r, 1500))
    
    // Remove from queue
    setQueue(prev => prev.filter(q => q.id !== item.id))
    
    // Reset if no more items
    setJarvisState("idle")
    setStatusText("Aguardando evento")
    setCurrentAction(null)
    setIsProcessing(false)
  }, [addLog])

  // Process queue automatically
  useEffect(() => {
    const nextItem = queue.find(q => q.status === "queued")
    if (nextItem && !isProcessing) {
      processQueueItem(nextItem)
    }
  }, [queue, isProcessing, processQueueItem])

  // Add to queue
  const handleSimulate = useCallback((simId: string, label: string) => {
    const newItem: QueueItem = {
      id: `queue-${Date.now()}-${Math.random()}`,
      simId,
      label,
      addedAt: new Date(),
      status: "queued",
    }
    setQueue(prev => [...prev, newItem])
    addLog("info", "QUEUE_ADD", `${label} adicionado a fila`)
  }, [addLog])

  const config = stateConfig[jarvisState]
  const isActive = jarvisState !== "idle"

  // Format time
  const formatTime = (date: Date) => date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  const formatTimeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diff < 60) return `${diff}s`
    if (diff < 3600) return `${Math.floor(diff / 60)}m`
    return `${Math.floor(diff / 3600)}h`
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex overflow-hidden">
      {/* Premium metallic background with multiple layers */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Base metallic gradient */}
        <div className="absolute inset-0 bg-metallic-dark" />
        {/* Hex grid pattern overlay */}
        <div className="absolute inset-0 bg-hex-grid opacity-60" />
        {/* Brushed metal texture */}
        <div className="absolute inset-0 brushed-metal" />
        {/* Ambient glow from center */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_40%,_oklch(0.68_0.22_255_/_6%)_0%,_transparent_60%)]" />
        {/* Top light reflection */}
        <div className="absolute inset-x-0 top-0 h-[400px] bg-gradient-to-b from-primary/[0.04] to-transparent" />
        {/* Vignette effect */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,_transparent_30%,_oklch(0_0_0_/_50%)_100%)]" />
        {/* Shimmer overlay */}
        <div className="absolute inset-0 shimmer opacity-30" />
      </div>

      {/* Sidebar */}
      <aside className="w-[200px] border-r border-border/20 bg-gradient-to-b from-card/40 via-card/20 to-transparent backdrop-blur-sm flex flex-col relative z-10">
        <nav className="flex-1 p-3 space-y-1 pt-6">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActiveTab = item.id === activeTab
            const count = item.id === "falhas" ? failures.filter(f => !f.resolved).length : 0
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative",
                  isActiveTab 
                    ? "bg-primary/15 text-primary border border-primary/20" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
                {count > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 text-[10px] bg-destructive text-white rounded-full font-bold">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* System status */}
        <div className="p-4 border-t border-border/20 bg-card/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-chart-2 pulse-dot glow-green" />
            <span className="text-xs font-medium text-foreground">Sistema estavel</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/60 mb-3">
            <span>Processados: {processedCount}</span>
            <span>Fila: {queue.length}</span>
          </div>
          <div className="h-8 flex items-end gap-0.5">
            {[40, 65, 45, 80, 55, 70, 50, 65, 85, 60, 75, 90].map((h, i) => (
              <div key={i} className="flex-1 bg-gradient-to-t from-primary/30 to-primary/10 rounded-t transition-all duration-300" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* Header */}
        <header className="h-14 border-b border-border/30 bg-card/20 backdrop-blur-md flex items-center px-6 gap-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <Layers className="w-4 h-4 text-primary" />
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-chart-2/10 border border-chart-2/20">
            <div className="w-1.5 h-1.5 rounded-full bg-chart-2 pulse-dot" />
            <span className="text-[11px] font-semibold text-chart-2">ATIVO</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Central Play</span>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20">Plus</span>
          </div>

          <div className="ml-auto flex items-center gap-4">
            {queue.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-chart-3/10 border border-chart-3/20">
                <ListOrdered className="w-3.5 h-3.5 text-chart-3" />
                <span className="text-xs font-medium text-chart-3">{queue.length} na fila</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
              <Zap className="w-3.5 h-3.5" />
              <span>Tempo real</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary to-card flex items-center justify-center text-xs font-semibold text-foreground border border-border/30 relative">
              JS
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-chart-2 border-2 border-background" />
            </div>
          </div>
        </header>

        {/* Main area */}
        <main className="flex-1 overflow-auto">
          {activeTab === "central" && (
            <div className="h-full flex flex-col">
              {/* JARVIS Section */}
              <div className="flex-1 flex items-center justify-center py-8 relative">
                {/* Ambient glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-primary/[0.02] rounded-full blur-[120px]" />
                
                {/* Side cards - Last Event */}
                <div className="absolute left-8 top-1/2 -translate-y-1/2 w-[200px]">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground/60">
                      <Zap className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-semibold tracking-wider">ULTIMO EVENTO</span>
                    </div>
                    <div className={cn(
                      "p-4 rounded-xl border backdrop-blur-sm transition-all duration-500",
                      lastEvent ? "bg-card/60 border-primary/20 glow-blue-sm" : "bg-card/30 border-border/20"
                    )}>
                      {lastEvent ? (
                        <>
                          <p className="text-sm font-medium text-foreground mb-3">{lastEvent.text}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50">
                            <Clock className="w-3 h-3" />
                            Ha {formatTimeAgo(lastEvent.time)}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground/30">Aguardando...</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* JARVIS Core */}
                <div className="relative flex flex-col items-center">
                  <div className="relative w-[420px] h-[420px] flex items-center justify-center">
                    {/* Outer rings with neon */}
                    <div className="absolute w-[400px] h-[400px] rounded-full border border-primary/8 orbit-ring-slow" />
                    <div className={cn("absolute w-[350px] h-[350px] rounded-full border-[1.5px] orbit-ring-slow", isActive ? "border-primary/30 neon-ring" : "border-primary/15")} />
                    <div className={cn("absolute w-[300px] h-[300px] rounded-full border-2 orbit-ring-reverse", isActive ? "border-primary/50 neon-ring-intense ring-pulse" : "border-primary/25")} />
                    <div className={cn("absolute w-[250px] h-[250px] rounded-full border-2 orbit-ring", isActive ? "border-primary/60 neon-ring-intense" : "border-primary/30")} />
                    
                    {/* Energy particles */}
                    <div className="absolute w-[350px] h-[350px] orbit-ring-slow">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary energy-particle" />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary/60 energy-particle" style={{ animationDelay: "1s" }} />
                    </div>
                    <div className="absolute w-[300px] h-[300px] orbit-ring-reverse">
                      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-2 h-2 rounded-full bg-chart-5 energy-particle" style={{ animationDelay: "0.5s" }} />
                    </div>
                    
                    {/* Inner glow */}
                    <div className={cn(
                      "absolute w-[220px] h-[220px] rounded-full transition-all duration-500",
                      isActive 
                        ? "bg-gradient-to-br from-primary/30 via-primary/10 to-primary/25 orbit-ring-fast" 
                        : "bg-gradient-to-br from-primary/15 via-primary/5 to-primary/12 orbit-ring-slow"
                    )} />

                    {/* Core orb */}
                    <div className={cn(
                      "relative w-[180px] h-[180px] rounded-full flex flex-col items-center justify-center",
                      "bg-gradient-to-br from-[#070d18] via-[#0a1525] to-[#070d18]",
                      "border-2 transition-all duration-300",
                      isActive ? "border-primary/60" : "border-primary/40",
                      isActive ? "jarvis-processing" : "jarvis-breathe"
                    )}>
                      <div className="absolute inset-0 rounded-full core-inner-glow" />
                      
                      {isActive && (
                        <div className="absolute inset-0 rounded-full overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/25 to-transparent scanning" style={{ backgroundSize: "200% 100%" }} />
                        </div>
                      )}

                      <div className="relative z-10 text-center px-4">
                        <div className={cn("text-xs font-bold tracking-[0.2em] mb-1.5 text-glow", config.color)}>
                          {config.label}
                        </div>
                        <div className="text-[13px] text-foreground/80 max-w-[140px] leading-snug">
                          {statusText}
                        </div>
                        <div className="flex items-center justify-center gap-1.5 mt-3">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className={cn(
                              "w-1.5 h-1.5 rounded-full bg-primary transition-all",
                              isActive && "energy-particle"
                            )} style={{ animationDelay: `${i * 200}ms` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center mt-4">
                    <h1 className="text-xl font-bold tracking-[0.3em] text-foreground text-glow">JARVIS</h1>
                    <p className="text-[10px] text-muted-foreground/40 tracking-[0.2em] mt-1">CENTRAL PLAY</p>
                  </div>

                  {/* Context */}
                  {context && (
                    <div className="mt-4 flex items-center gap-3 px-5 py-2.5 rounded-full bg-card/50 border border-primary/15 backdrop-blur-sm">
                      <User className="w-3.5 h-3.5 text-primary/60" />
                      <span className="text-sm text-foreground">{context.name}</span>
                      <span className="w-1 h-1 rounded-full bg-primary/30" />
                      <span className="text-sm text-muted-foreground/70">{context.device}</span>
                      <span className="w-1 h-1 rounded-full bg-primary/30" />
                      <span className="text-sm text-primary">{context.flow}</span>
                    </div>
                  )}
                </div>

                {/* Side cards - Action & Queue */}
                <div className="absolute right-8 top-1/2 -translate-y-1/2 w-[200px] space-y-4">
                  {/* Current Action */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground/60">
                      <Play className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-semibold tracking-wider">ACAO ATUAL</span>
                    </div>
                    <div className={cn(
                      "p-4 rounded-xl border backdrop-blur-sm transition-all duration-500",
                      currentAction ? "bg-card/60 border-chart-2/20" : "bg-card/30 border-border/20"
                    )}>
                      {currentAction ? (
                        <>
                          <p className="text-sm font-medium text-foreground mb-3">{currentAction}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-chart-2">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Em andamento
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground/30">Nenhuma acao</p>
                      )}
                    </div>
                  </div>

                  {/* Queue */}
                  {queue.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground/60">
                        <ListOrdered className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-semibold tracking-wider">FILA</span>
                      </div>
                      <div className="p-3 rounded-xl border border-chart-3/20 bg-card/40 backdrop-blur-sm space-y-2">
                        {queue.slice(0, 3).map((item, i) => (
                          <div key={item.id} className={cn(
                            "flex items-center gap-2 text-xs p-2 rounded-lg",
                            item.status === "processing" ? "bg-primary/10 text-primary" : "bg-secondary/30 text-muted-foreground"
                          )}>
                            {item.status === "processing" ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <span className="w-3 h-3 flex items-center justify-center text-[10px] text-muted-foreground/50">{i + 1}</span>
                            )}
                            <span className="truncate">{item.label}</span>
                          </div>
                        ))}
                        {queue.length > 3 && (
                          <p className="text-[10px] text-muted-foreground/40 text-center">+{queue.length - 3} mais</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom section */}
              <div className="border-t border-border/20 bg-card/20 backdrop-blur-sm p-6">
                <div className="max-w-[1200px] mx-auto grid grid-cols-12 gap-6">
                  {/* Simulator */}
                  <div className="col-span-8">
                    <div className="flex items-center gap-2 mb-4">
                      <Zap className="w-4 h-4 text-primary/70" />
                      <span className="text-xs font-semibold text-muted-foreground/70 tracking-wider">SIMULAR</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {simulations.map((sim) => (
                        <Button
                          key={sim.id}
                          variant="outline"
                          size="sm"
                          onClick={() => handleSimulate(sim.id, sim.label)}
                          className="h-10 px-4 gap-2 bg-card/50 border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all"
                        >
                          <span className="text-primary/70">{sim.icon}</span>
                          <span className="text-sm">{sim.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Mini Console */}
                  <div className="col-span-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Terminal className="w-4 h-4 text-primary/70" />
                      <span className="text-xs font-semibold text-muted-foreground/70 tracking-wider">CONSOLE</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#080c14] border border-border/20 font-mono text-xs space-y-1 h-[100px] overflow-hidden">
                      {logs.slice(0, 4).map((log) => (
                        <div key={log.id} className="flex items-center gap-2 terminal-line">
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            log.level === "success" ? "bg-chart-2" :
                            log.level === "error" ? "bg-destructive" :
                            log.level === "warning" ? "bg-chart-3" : "bg-primary"
                          )} />
                          <span className="text-foreground/80">{log.code}</span>
                          <span className="ml-auto text-muted-foreground/40">{formatTime(log.timestamp)}</span>
                        </div>
                      ))}
                      {logs.length === 0 && (
                        <div className="text-muted-foreground/30 flex items-center gap-2">
                          <span className="terminal-cursor">_</span>
                          aguardando...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Falhas Tab */}
          {activeTab === "falhas" && (
            <div className="p-8 max-w-[1000px] mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Falhas</h2>
                  <p className="text-sm text-muted-foreground/60 mt-1">Historico de erros e falhas do sistema</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{failures.filter(f => !f.resolved).length} nao resolvidas</span>
                </div>
              </div>

              {failures.length === 0 ? (
                <div className="text-center py-20">
                  <CheckCircle2 className="w-12 h-12 text-chart-2/30 mx-auto mb-4" />
                  <p className="text-muted-foreground/50">Nenhuma falha registrada</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {failures.map((failure) => (
                    <div key={failure.id} className={cn(
                      "p-4 rounded-xl border transition-all",
                      failure.resolved 
                        ? "bg-card/30 border-border/20" 
                        : "bg-destructive/5 border-destructive/20"
                    )}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {failure.resolved ? (
                            <CheckCircle2 className="w-5 h-5 text-chart-2" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive" />
                          )}
                          <div>
                            <p className="font-medium text-foreground">{failure.code}</p>
                            <p className="text-sm text-muted-foreground/70 mt-0.5">{failure.message}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground/50">{formatTime(failure.timestamp)}</p>
                          {!failure.resolved && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mt-2 h-7 text-xs text-chart-2 hover:text-chart-2 hover:bg-chart-2/10"
                              onClick={() => setFailures(prev => prev.map(f => f.id === failure.id ? { ...f, resolved: true } : f))}
                            >
                              Resolver
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Console Tab */}
          {activeTab === "console" && (
            <div className="p-8 max-w-[1200px] mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Console</h2>
                  <p className="text-sm text-muted-foreground/60 mt-1">Logs detalhados do sistema</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setLogs([])} className="text-xs">
                  Limpar
                </Button>
              </div>

              <div className="rounded-xl bg-[#080c14] border border-border/20 overflow-hidden">
                <div className="p-3 border-b border-border/10 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-chart-3/60" />
                  <div className="w-3 h-3 rounded-full bg-chart-2/60" />
                  <span className="ml-2 text-xs text-muted-foreground/40 font-mono">jarvis-console</span>
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="p-4 font-mono text-sm space-y-2">
                    {logs.length === 0 ? (
                      <div className="text-muted-foreground/30 flex items-center gap-2">
                        <span className="terminal-cursor">_</span>
                        Aguardando logs...
                      </div>
                    ) : (
                      logs.map((log) => (
                        <div key={log.id} className="flex items-start gap-3 terminal-line">
                          <span className="text-muted-foreground/40 shrink-0 w-20">{formatTime(log.timestamp)}</span>
                          <span className={cn(
                            "shrink-0 w-16 font-semibold",
                            log.level === "success" ? "text-chart-2" :
                            log.level === "error" ? "text-destructive" :
                            log.level === "warning" ? "text-chart-3" : "text-primary"
                          )}>
                            [{log.level.toUpperCase()}]
                          </span>
                          <span className="text-foreground/90">{log.code}</span>
                          {log.detail && (
                            <span className="text-muted-foreground/50">— {log.detail}</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Historico Tab */}
          {activeTab === "historico" && (
            <div className="p-8 max-w-[1000px] mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Historico</h2>
                  <p className="text-sm text-muted-foreground/60 mt-1">Eventos processados recentemente</p>
                </div>
                <div className="text-sm text-muted-foreground/50">
                  {history.length} eventos
                </div>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-20">
                  <History className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                  <p className="text-muted-foreground/50">Nenhum evento processado ainda</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl bg-card/40 border border-border/20">
                      {item.success ? (
                        <CheckCircle2 className="w-5 h-5 text-chart-2" />
                      ) : (
                        <XCircle className="w-5 h-5 text-destructive" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground/50 mt-0.5">{item.module}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground/40">{formatTime(item.time)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
