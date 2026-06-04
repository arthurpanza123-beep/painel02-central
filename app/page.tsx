"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Activity, AlertTriangle, Terminal, Settings, Zap, ArrowRight, Tv, MessageSquare, RefreshCw, CreditCard, Sparkles, HelpCircle } from "lucide-react"
import { FailuresPanel, type FailureEntry } from "@/components/jarvis/failures-panel"

// Types
type JarvisState = "idle" | "receiving" | "interpreting" | "detecting" | "preparing" | "executing" | "validating" | "completed" | "failed" | "retry"
type LogEntry = { id: string; timestamp: Date; level: "info" | "success" | "warning" | "error"; code: string; message?: string }

// Flow configurations
const FLOWS: Record<string, { 
  module: string
  states: { state: JarvisState; text: string; duration: number }[]
  logs: { level: LogEntry["level"]; code: string; message?: string }[]
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
      { state: "executing", text: "Confirmando", duration: 500 },
      { state: "completed", text: "Pagamento OK", duration: 2500 },
    ],
    logs: [
      { level: "info", code: "PAYMENT_CHECK" },
      { level: "success", code: "PAYMENT_OK" },
    ],
  },
  "quero-ativar": {
    module: "Boas-vindas",
    states: [
      { state: "receiving", text: "Solicitação", duration: 400 },
      { state: "executing", text: "Iniciando", duration: 800 },
      { state: "completed", text: "Boas-vindas OK", duration: 2500 },
    ],
    logs: [
      { level: "info", code: "ACTIVATION" },
      { level: "success", code: "WELCOME_SENT" },
    ],
  },
  "lista-nao-carrega": {
    module: "Suporte",
    states: [
      { state: "receiving", text: "Problema", duration: 400 },
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
      { state: "executing", text: "Disparando", duration: 500 },
      { state: "completed", text: "Teste OK", duration: 2500 },
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

export default function JarvisPage() {
  const [tab, setTab] = useState("central")
  const [jarvisState, setJarvisState] = useState<JarvisState>("idle")
  const [statusText, setStatusText] = useState("Aguardando evento")
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [lastEvent, setLastEvent] = useState<string | null>(null)
  const [currentAction, setCurrentAction] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [failures, setFailures] = useState<FailureEntry[]>([])
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
    setLastEvent(label)
    setActiveModule(flow.module)
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
      
      // Set current action
      if (step.state === "executing" || step.state === "retry") {
        setCurrentAction(step.text)
      }

      // Add log
      if (flow.logs[logIndex]) {
        addLog(flow.logs[logIndex].level, flow.logs[logIndex].code)
        logIndex++
      }

      await new Promise(r => setTimeout(r, step.duration))
    }

    // Add failure for audio scenario randomly
    if (simId === "audio-falhou" && Math.random() > 0.7) {
      setFailures(prev => [{
        id: `fail-${Date.now()}`,
        text: "Áudio 4 falhou novamente",
        timestamp: new Date(),
        retryCount: 2,
      }, ...prev])
    }

    // Reset
    await new Promise(r => setTimeout(r, 2000))
    setJarvisState("idle")
    setStatusText("Aguardando evento")
    setActiveModule(null)
    setCurrentAction(null)
    setIsSimulating(false)
  }, [isSimulating, addLog])

  // Failure handlers
  const handleRetry = useCallback((id: string) => {
    setFailures(prev => prev.filter(f => f.id !== id))
    handleSimulate("audio-falhou", "Retry áudio")
  }, [handleSimulate])

  const handleSkip = useCallback((id: string) => {
    setFailures(prev => prev.filter(f => f.id !== id))
  }, [])

  const handleResolve = useCallback((id: string) => {
    setFailures(prev => prev.filter(f => f.id !== id))
  }, [])

  const config = stateConfig[jarvisState]
  const isProcessing = jarvisState !== "idle" && jarvisState !== "completed"

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/[0.04] rounded-full blur-[100px]" />
      </div>

      {/* Header - minimal */}
      <header className="relative border-b border-border/40 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 rounded-full bg-chart-2 pulse-dot glow-green" />
              <span className="text-xs font-semibold text-chart-2">ATIVO</span>
            </div>
            <div className="h-5 w-px bg-border/30" />
            <span className="text-sm font-semibold text-foreground">Central Play</span>
            <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">Plus</span>
          </div>
          <Settings className="w-4 h-4 text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors" />
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        {/* Tabs - minimal */}
        <div className="border-b border-border/30 bg-card/20">
          <div className="max-w-[1400px] mx-auto px-8">
            <TabsList className="h-12 bg-transparent gap-1 p-0">
              <TabsTrigger
                value="central"
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-5 gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Activity className="w-4 h-4" />
                Central
              </TabsTrigger>
              <TabsTrigger
                value="falhas"
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-5 gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <AlertTriangle className="w-4 h-4" />
                Falhas
                {failures.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-destructive text-white rounded-full font-bold">
                    {failures.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="console"
                className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-5 gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Terminal className="w-4 h-4" />
                Console
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Central Tab - MINIMAL */}
        <TabsContent value="central" className="mt-0">
          <div className="max-w-[1200px] mx-auto px-8 py-12">
            {/* Main Layout - 3 column minimal */}
            <div className="grid grid-cols-12 gap-12 items-start">
              
              {/* Left - Last Event (single card) */}
              <div className="col-span-12 lg:col-span-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground/60">
                    <Zap className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium tracking-wide">ÚLTIMO EVENTO</span>
                  </div>
                  <div className={cn(
                    "p-5 rounded-2xl border transition-all duration-500",
                    lastEvent 
                      ? "bg-card/80 border-border/60" 
                      : "bg-card/30 border-border/20"
                  )}>
                    {lastEvent ? (
                      <p className="text-sm text-foreground leading-relaxed">
                        {lastEvent}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground/40">
                        Aguardando...
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Center - JARVIS Core (protagonist) */}
              <div className="col-span-12 lg:col-span-6">
                <div className="flex flex-col items-center">
                  {/* Core orb */}
                  <div className="relative">
                    {/* Outer rings */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-[340px] h-[340px] rounded-full border border-primary/8 orbit-ring-slow" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-[300px] h-[300px] rounded-full border border-primary/12 orbit-ring-reverse" />
                    </div>
                    
                    {/* Glow ring */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={cn(
                        "w-[260px] h-[260px] rounded-full",
                        "bg-gradient-to-br from-primary/10 via-transparent to-primary/8",
                        isProcessing ? "orbit-ring-fast" : "orbit-ring-slow"
                      )} />
                    </div>

                    {/* Core */}
                    <div className={cn(
                      "relative w-[220px] h-[220px] rounded-full mx-auto",
                      "bg-gradient-to-br from-card via-secondary/60 to-card",
                      "border border-primary/25",
                      "flex flex-col items-center justify-center",
                      isProcessing ? "jarvis-processing" : "jarvis-breathe"
                    )}>
                      {/* Scanning effect */}
                      {isProcessing && (
                        <div className="absolute inset-0 rounded-full overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/12 to-transparent scanning" style={{ backgroundSize: "200% 100%" }} />
                        </div>
                      )}

                      {/* Content */}
                      <div className="relative z-10 text-center px-6">
                        <div className={cn("text-xs font-bold tracking-[0.25em] mb-2", config.color)}>
                          {config.label}
                        </div>
                        <div className="text-sm text-foreground/70 max-w-[160px] leading-relaxed">
                          {statusText}
                        </div>
                        {activeModule && (
                          <div className="mt-3 text-[10px] font-mono text-primary/80 tracking-wider">
                            [{activeModule.toUpperCase()}]
                          </div>
                        )}
                      </div>

                      {/* Corner accents */}
                      <div className="absolute top-4 left-4 w-5 h-5 border-t border-l border-primary/30 rounded-tl-lg" />
                      <div className="absolute top-4 right-4 w-5 h-5 border-t border-r border-primary/30 rounded-tr-lg" />
                      <div className="absolute bottom-4 left-4 w-5 h-5 border-b border-l border-primary/30 rounded-bl-lg" />
                      <div className="absolute bottom-4 right-4 w-5 h-5 border-b border-r border-primary/30 rounded-br-lg" />
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center mt-8">
                    <h1 className="text-base font-bold tracking-[0.15em] text-primary text-glow">
                      JARVIS
                    </h1>
                    <p className="text-[10px] text-muted-foreground/50 tracking-[0.1em] mt-1">
                      CENTRAL PLAY
                    </p>
                  </div>

                  {/* Context mini - only when active */}
                  {context && (
                    <div className="mt-8 flex items-center gap-6 text-xs text-muted-foreground/60">
                      <span>{context.name}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span>{context.device}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="text-primary/70">{context.flow}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right - Current Action (single card) */}
              <div className="col-span-12 lg:col-span-3">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground/60">
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span className="text-[11px] font-medium tracking-wide">AÇÃO ATUAL</span>
                  </div>
                  <div className={cn(
                    "p-5 rounded-2xl border transition-all duration-500",
                    currentAction 
                      ? "bg-card/80 border-chart-2/30" 
                      : "bg-card/30 border-border/20"
                  )}>
                    {currentAction ? (
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-chart-2 animate-pulse" />
                        <p className="text-sm text-foreground leading-relaxed">
                          {currentAction}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground/40">
                        —
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom - Simulator + Mini Console */}
            <div className="mt-16 grid grid-cols-12 gap-8">
              {/* Simulator - compact */}
              <div className="col-span-12 lg:col-span-7">
                <div className="flex items-center gap-3 mb-4">
                  <Zap className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <span className="text-[11px] font-medium tracking-wide text-muted-foreground/50">SIMULAR</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {simulations.map((sim) => (
                    <Button
                      key={sim.id}
                      variant="outline"
                      size="sm"
                      disabled={isSimulating}
                      onClick={() => handleSimulate(sim.id, sim.label)}
                      className={cn(
                        "h-9 px-4 gap-2 rounded-full",
                        "border-border/40 hover:border-primary/40 hover:bg-primary/5",
                        "text-xs font-medium",
                        isSimulating && "opacity-50"
                      )}
                    >
                      <span className="text-primary/70">{sim.icon}</span>
                      {sim.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Mini Console - 4 lines max */}
              <div className="col-span-12 lg:col-span-5">
                <div className="flex items-center gap-3 mb-4">
                  <Terminal className="w-3.5 h-3.5 text-muted-foreground/50" />
                  <span className="text-[11px] font-medium tracking-wide text-muted-foreground/50">CONSOLE</span>
                </div>
                <div className="font-mono text-[11px] space-y-1 text-muted-foreground/60">
                  {logs.length === 0 ? (
                    <div><span className="text-primary/40">$</span> aguardando...</div>
                  ) : (
                    logs.slice(0, 4).map((log) => (
                      <div key={log.id} className="flex items-center gap-2">
                        <span className={cn(
                          "w-1 h-1 rounded-full",
                          log.level === "success" && "bg-chart-2",
                          log.level === "error" && "bg-destructive",
                          log.level === "warning" && "bg-chart-3",
                          log.level === "info" && "bg-primary/50"
                        )} />
                        <span className="text-foreground/60">{log.code}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Falhas Tab */}
        <TabsContent value="falhas" className="mt-0">
          <div className="max-w-[800px] mx-auto p-8">
            <FailuresPanel 
              failures={failures}
              onRetry={handleRetry}
              onSkip={handleSkip}
              onResolve={handleResolve}
            />
          </div>
        </TabsContent>

        {/* Console Tab - Full */}
        <TabsContent value="console" className="mt-0">
          <div className="max-w-[1000px] mx-auto p-8">
            <div className="bg-card/40 rounded-2xl border border-border/40 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Terminal className="w-4 h-4 text-primary/60" />
                <span className="text-sm font-medium text-foreground/80">Console</span>
                <div className="ml-auto w-2 h-2 rounded-full bg-chart-2 pulse-dot" />
              </div>
              <div className="font-mono text-xs space-y-2 max-h-[500px] overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="text-muted-foreground/40"><span className="text-primary/40">$</span> aguardando...</div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3">
                      <span className={cn(
                        "shrink-0 w-14",
                        log.level === "success" && "text-chart-2",
                        log.level === "error" && "text-destructive",
                        log.level === "warning" && "text-chart-3",
                        log.level === "info" && "text-primary/60"
                      )}>
                        [{log.level.slice(0, 4).toUpperCase()}]
                      </span>
                      <span className="text-foreground/70">{log.code}</span>
                      <span className="text-muted-foreground/40 ml-auto">
                        {log.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
