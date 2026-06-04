"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Activity, AlertTriangle, Terminal, Settings, Zap, ArrowRight, Tv, MessageSquare, 
  RefreshCw, CreditCard, Sparkles, HelpCircle, Clock, History, Monitor, BarChart3,
  User, ChevronRight
} from "lucide-react"

// Types
type JarvisState = "idle" | "receiving" | "interpreting" | "detecting" | "preparing" | "executing" | "validating" | "completed" | "failed" | "retry"
type LogEntry = { id: string; timestamp: Date; level: "info" | "success" | "warning" | "error"; code: string }

// Flow configurations
const FLOWS: Record<string, { 
  module: string
  states: { state: JarvisState; text: string; duration: number }[]
  logs: { level: LogEntry["level"]; code: string }[]
}> = {
  "tv-lg": {
    module: "Instalação",
    states: [
      { state: "receiving", text: "Recebendo resposta", duration: 400 },
      { state: "interpreting", text: "Interpretando", duration: 500 },
      { state: "detecting", text: "Detectando LG", duration: 400 },
      { state: "executing", text: "Preparando instalação", duration: 600 },
      { state: "completed", text: "Instalação LG pronta", duration: 2500 },
    ],
    logs: [
      { level: "info", code: "DEVICE_LG" },
      { level: "info", code: "INTENT_INSTALL" },
      { level: "success", code: "DISPATCH_READY" },
    ],
  },
  "audio-falhou": {
    module: "Reenvio",
    states: [
      { state: "receiving", text: "Falha detectada", duration: 400 },
      { state: "failed", text: "Áudio 4 falhou", duration: 600 },
      { state: "retry", text: "Preparando retry", duration: 400 },
      { state: "executing", text: "Reenviando", duration: 500 },
      { state: "completed", text: "Áudio 4 reenviado", duration: 2500 },
    ],
    logs: [
      { level: "error", code: "AUDIO_4_FAILED" },
      { level: "warning", code: "RETRY_INIT" },
      { level: "success", code: "AUDIO_4_SENT" },
    ],
  },
  "ja-paguei": {
    module: "Cobrança",
    states: [
      { state: "receiving", text: "Verificando", duration: 400 },
      { state: "executing", text: "Confirmando pagamento", duration: 500 },
      { state: "completed", text: "Pagamento confirmado", duration: 2500 },
    ],
    logs: [
      { level: "info", code: "PAYMENT_CHECK" },
      { level: "success", code: "PAYMENT_OK" },
    ],
  },
  "quero-ativar": {
    module: "Boas-vindas",
    states: [
      { state: "receiving", text: "Solicitação recebida", duration: 400 },
      { state: "executing", text: "Iniciando ativação", duration: 800 },
      { state: "completed", text: "Boas-vindas enviado", duration: 2500 },
    ],
    logs: [
      { level: "info", code: "ACTIVATION" },
      { level: "success", code: "WELCOME_SENT" },
    ],
  },
  "lista-nao-carrega": {
    module: "Suporte",
    states: [
      { state: "receiving", text: "Problema reportado", duration: 400 },
      { state: "executing", text: "Buscando solução", duration: 600 },
      { state: "completed", text: "Suporte enviado", duration: 2500 },
    ],
    logs: [
      { level: "warning", code: "ISSUE_LIST" },
      { level: "success", code: "SUPPORT_SENT" },
    ],
  },
  "teste-gerado": {
    module: "Teste",
    states: [
      { state: "receiving", text: "Teste #0001", duration: 400 },
      { state: "executing", text: "Disparando teste", duration: 500 },
      { state: "completed", text: "Teste concluído", duration: 2500 },
    ],
    logs: [
      { level: "info", code: "TEST_0001" },
      { level: "success", code: "TEST_SENT" },
    ],
  },
}

// Simulations
const simulations = [
  { id: "tv-lg", label: "TV LG", icon: <Tv className="w-4 h-4" /> },
  { id: "audio-falhou", label: "Áudio falhou", icon: <RefreshCw className="w-4 h-4" /> },
  { id: "ja-paguei", label: "Já paguei", icon: <CreditCard className="w-4 h-4" /> },
  { id: "quero-ativar", label: "Ativar", icon: <Sparkles className="w-4 h-4" /> },
  { id: "lista-nao-carrega", label: "Lista erro", icon: <HelpCircle className="w-4 h-4" /> },
  { id: "teste-gerado", label: "Teste", icon: <MessageSquare className="w-4 h-4" /> },
]

// State config
const stateConfig: Record<JarvisState, { label: string; color: string }> = {
  idle: { label: "AGUARDANDO", color: "text-primary" },
  receiving: { label: "RECEBENDO", color: "text-primary" },
  interpreting: { label: "INTERPRETANDO", color: "text-primary" },
  detecting: { label: "DETECTANDO", color: "text-primary" },
  preparing: { label: "PREPARANDO", color: "text-primary" },
  executing: { label: "EXECUTANDO", color: "text-chart-2" },
  validating: { label: "VALIDANDO", color: "text-chart-3" },
  completed: { label: "CONCLUÍDO", color: "text-chart-2" },
  failed: { label: "FALHA", color: "text-destructive" },
  retry: { label: "RETRY", color: "text-chart-3" },
}

// Sidebar items
const sidebarItems = [
  { id: "central", label: "Central", icon: Activity, active: true },
  { id: "falhas", label: "Falhas", icon: AlertTriangle },
  { id: "console", label: "Console", icon: Terminal },
  { id: "simulacoes", label: "Simulações", icon: Sparkles },
  { id: "historico", label: "Histórico", icon: History },
  { id: "dispositivos", label: "Dispositivos", icon: Monitor },
  { id: "relatorios", label: "Relatórios", icon: BarChart3 },
  { id: "configuracoes", label: "Configurações", icon: Settings },
]

// Log level config
const logLevelConfig: Record<string, { color: string }> = {
  info: { color: "text-primary" },
  success: { color: "text-chart-2" },
  warning: { color: "text-chart-3" },
  error: { color: "text-destructive" },
}

export default function JarvisPage() {
  const [activeTab, setActiveTab] = useState("central")
  const [jarvisState, setJarvisState] = useState<JarvisState>("idle")
  const [statusText, setStatusText] = useState("Aguardando evento")
  const [lastEvent, setLastEvent] = useState<{ text: string; time: Date } | null>(null)
  const [currentAction, setCurrentAction] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isSimulating, setIsSimulating] = useState(false)
  const [context, setContext] = useState<{ name: string; device: string; flow: string } | null>(null)

  // Add log
  const addLog = useCallback((level: LogEntry["level"], code: string) => {
    setLogs(prev => [{
      id: `log-${Date.now()}`,
      timestamp: new Date(),
      level,
      code,
    }, ...prev].slice(0, 50))
  }, [])

  // Simulate
  const handleSimulate = useCallback(async (simId: string, label: string) => {
    if (isSimulating) return
    setIsSimulating(true)

    const flow = FLOWS[simId]
    if (!flow) {
      setIsSimulating(false)
      return
    }

    // Set initial state
    setLastEvent({ text: label, time: new Date() })
    setContext({
      name: "João Silva",
      device: simId === "tv-lg" ? "LG" : "—",
      flow: flow.module,
    })

    // Process states
    let logIndex = 0
    for (const step of flow.states) {
      setJarvisState(step.state)
      setStatusText(step.text)
      
      if (step.state === "executing" || step.state === "retry") {
        setCurrentAction(step.text)
      }

      if (flow.logs[logIndex]) {
        addLog(flow.logs[logIndex].level, flow.logs[logIndex].code)
        logIndex++
      }

      await new Promise(r => setTimeout(r, step.duration))
    }

    // Reset
    await new Promise(r => setTimeout(r, 2000))
    setJarvisState("idle")
    setStatusText("Aguardando evento")
    setCurrentAction(null)
    setIsSimulating(false)
  }, [isSimulating, addLog])

  const config = stateConfig[jarvisState]
  const isProcessing = jarvisState !== "idle" && jarvisState !== "completed"

  // Format time ago
  const formatTimeAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000)
    if (diff < 60) return `Há ${diff}s`
    if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`
    return `Há ${Math.floor(diff / 3600)}h`
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Sidebar */}
      <aside className="w-[220px] border-r border-border/40 bg-sidebar flex flex-col">
        {/* Sidebar navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = item.id === activeTab
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* System status */}
        <div className="p-4 border-t border-border/40">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-chart-2 glow-green" />
            <span className="text-xs font-semibold text-foreground">Sistema estável</span>
          </div>
          <p className="text-[10px] text-muted-foreground/60 mb-3">
            Todos os serviços operacionais
          </p>
          {/* Mini chart placeholder */}
          <div className="h-10 flex items-end gap-0.5">
            {[40, 60, 45, 80, 55, 70, 50, 65, 75, 60, 85, 70].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/20 rounded-t"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 border-b border-border/40 bg-card/30 backdrop-blur-sm flex items-center px-6 gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary" />
            </div>
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-chart-2/10 border border-chart-2/20">
            <div className="w-1.5 h-1.5 rounded-full bg-chart-2 pulse-dot" />
            <span className="text-[11px] font-semibold text-chart-2">ATIVO</span>
          </div>

          {/* Brand */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Central Play</span>
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">Plus</span>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 ml-8">
            {["Central", "Falhas", "Console"].map((tab) => {
              const isActive = tab.toLowerCase() === activeTab
              const icons: Record<string, typeof Activity> = { Central: Activity, Falhas: AlertTriangle, Console: Terminal }
              const Icon = icons[tab]
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-lg",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab}
                  {tab.toLowerCase() === activeTab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Right side */}
          <div className="ml-auto flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
              <Zap className="w-3.5 h-3.5" />
              <span>Operações em tempo real</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-semibold text-foreground relative">
              JS
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-chart-2 border-2 border-background" />
            </div>
          </div>
        </header>

        {/* Main area */}
        <main className="flex-1 p-8 overflow-auto">
          {activeTab === "central" && (
            <div className="max-w-[1400px] mx-auto">
              {/* Main grid - Event | Jarvis | Action */}
              <div className="grid grid-cols-12 gap-8 items-start">
                
                {/* Left - Last Event */}
                <div className="col-span-12 lg:col-span-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground/70">
                      <Zap className="w-4 h-4" />
                      <span className="text-xs font-medium tracking-wide">ÚLTIMO EVENTO</span>
                    </div>
                    <div className={cn(
                      "p-5 rounded-xl border transition-all duration-500",
                      lastEvent 
                        ? "bg-card/80 border-border/50" 
                        : "bg-card/30 border-border/20"
                    )}>
                      {lastEvent ? (
                        <>
                          <p className="text-sm font-medium text-foreground mb-4">
                            {lastEvent.text}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                            <Clock className="w-3.5 h-3.5" />
                            {formatTimeAgo(lastEvent.time)}
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground/40">
                          Aguardando...
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center - JARVIS Core */}
                <div className="col-span-12 lg:col-span-6">
                  <div className="flex flex-col items-center">
                    {/* Core orb */}
                    <div className="relative">
                      {/* Outer rings */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-[380px] h-[380px] rounded-full border border-primary/8 orbit-ring-slow" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-[330px] h-[330px] rounded-full border border-primary/12 orbit-ring-reverse" />
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-[280px] h-[280px] rounded-full border border-primary/18 orbit-ring" />
                      </div>
                      
                      {/* Inner glow ring */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className={cn(
                          "w-[240px] h-[240px] rounded-full",
                          "bg-gradient-to-br from-primary/15 via-transparent to-primary/10",
                          isProcessing ? "orbit-ring-fast" : "orbit-ring-slow"
                        )} />
                      </div>

                      {/* Core */}
                      <div className={cn(
                        "relative w-[200px] h-[200px] rounded-full mx-auto",
                        "bg-gradient-to-br from-card via-secondary/60 to-card",
                        "border border-primary/30",
                        "flex flex-col items-center justify-center",
                        isProcessing ? "jarvis-processing" : "jarvis-breathe"
                      )}>
                        {/* Scanning effect */}
                        {isProcessing && (
                          <div className="absolute inset-0 rounded-full overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/15 to-transparent scanning" style={{ backgroundSize: "200% 100%" }} />
                          </div>
                        )}

                        {/* Content */}
                        <div className="relative z-10 text-center px-5">
                          <div className={cn("text-xs font-bold tracking-[0.2em] mb-2", config.color)}>
                            {config.label}
                          </div>
                          <div className="text-[13px] text-foreground/75 max-w-[140px] leading-relaxed">
                            {statusText}
                          </div>
                          {/* Dots animation when processing */}
                          {isProcessing && (
                            <div className="flex items-center justify-center gap-1 mt-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: "0ms" }} />
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: "150ms" }} />
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: "300ms" }} />
                            </div>
                          )}
                        </div>

                        {/* Corner accents */}
                        <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-primary/25 rounded-tl-lg" />
                        <div className="absolute top-4 right-4 w-4 h-4 border-t border-r border-primary/25 rounded-tr-lg" />
                        <div className="absolute bottom-4 left-4 w-4 h-4 border-b border-l border-primary/25 rounded-bl-lg" />
                        <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-primary/25 rounded-br-lg" />
                      </div>
                    </div>

                    {/* Title */}
                    <div className="text-center mt-10">
                      <h1 className="text-lg font-bold tracking-[0.2em] text-foreground">
                        JARVIS
                      </h1>
                      <p className="text-[11px] text-muted-foreground/50 tracking-[0.15em] mt-1">
                        CENTRAL PLAY
                      </p>
                    </div>

                    {/* Context */}
                    {context && (
                      <div className="mt-6 flex items-center gap-4 px-5 py-2.5 rounded-full bg-card/50 border border-border/30">
                        <User className="w-4 h-4 text-muted-foreground/60" />
                        <span className="text-sm text-foreground">{context.name}</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                        <span className="text-sm text-muted-foreground">{context.device}</span>
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                        <span className="text-sm text-primary">{context.flow}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right - Current Action */}
                <div className="col-span-12 lg:col-span-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground/70">
                      <Settings className="w-4 h-4" />
                      <span className="text-xs font-medium tracking-wide">AÇÃO ATUAL</span>
                    </div>
                    <div className={cn(
                      "p-5 rounded-xl border transition-all duration-500",
                      currentAction 
                        ? "bg-card/80 border-border/50" 
                        : "bg-card/30 border-border/20"
                    )}>
                      {currentAction ? (
                        <>
                          <p className="text-sm font-medium text-foreground mb-4">
                            {currentAction}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Em andamento
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground/40">
                          —
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom section - Simulator + Console */}
              <div className="mt-12 grid grid-cols-12 gap-8">
                {/* Simulator */}
                <div className="col-span-12 lg:col-span-7">
                  <div className="p-6 rounded-xl bg-card/40 border border-border/30">
                    <div className="flex items-center gap-2 mb-5 text-muted-foreground/70">
                      <Zap className="w-4 h-4" />
                      <span className="text-xs font-medium tracking-wide">SIMULAR</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {simulations.map((sim) => (
                        <Button
                          key={sim.id}
                          variant="outline"
                          size="sm"
                          disabled={isSimulating}
                          onClick={() => handleSimulate(sim.id, sim.label)}
                          className={cn(
                            "h-10 px-5 gap-2.5 rounded-lg",
                            "bg-secondary/40 border-border/40 hover:border-primary/40 hover:bg-primary/5",
                            "text-sm font-medium",
                            isSimulating && "opacity-50"
                          )}
                        >
                          <span className="text-primary/70">{sim.icon}</span>
                          {sim.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Console */}
                <div className="col-span-12 lg:col-span-5">
                  <div className="p-6 rounded-xl bg-card/40 border border-border/30 h-full">
                    <div className="flex items-center gap-2 mb-5 text-muted-foreground/70">
                      <Terminal className="w-4 h-4" />
                      <span className="text-xs font-medium tracking-wide">CONSOLE</span>
                    </div>
                    <div className="space-y-2.5 font-mono text-xs">
                      {logs.length === 0 ? (
                        <div className="text-muted-foreground/40">Aguardando logs...</div>
                      ) : (
                        logs.slice(0, 4).map((log) => {
                          const levelConfig = logLevelConfig[log.level]
                          return (
                            <div key={log.id} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-2.5">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  log.level === "success" && "bg-chart-2",
                                  log.level === "info" && "bg-primary",
                                  log.level === "warning" && "bg-chart-3",
                                  log.level === "error" && "bg-destructive"
                                )} />
                                <span className="text-foreground">{log.code}</span>
                              </div>
                              <span className="text-muted-foreground/50">
                                {log.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              </span>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "falhas" && (
            <div className="max-w-[800px] mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <h2 className="text-lg font-semibold text-foreground">Falhas</h2>
              </div>
              <div className="p-8 rounded-xl bg-card/40 border border-border/30 text-center">
                <p className="text-muted-foreground">Nenhuma falha registrada</p>
              </div>
            </div>
          )}

          {activeTab === "console" && (
            <div className="max-w-[1000px] mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <Terminal className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Console</h2>
              </div>
              <div className="p-6 rounded-xl bg-card/40 border border-border/30">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 font-mono text-xs">
                    {logs.length === 0 ? (
                      <div className="text-muted-foreground/40">Aguardando logs...</div>
                    ) : (
                      logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between gap-4 py-1">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              log.level === "success" && "bg-chart-2",
                              log.level === "info" && "bg-primary",
                              log.level === "warning" && "bg-chart-3",
                              log.level === "error" && "bg-destructive"
                            )} />
                            <span className="text-foreground">{log.code}</span>
                          </div>
                          <span className="text-muted-foreground/50">
                            {log.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
