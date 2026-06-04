"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { JarvisCore, type JarvisState } from "@/components/jarvis/jarvis-core"
import { ModulesRing, getDefaultModules, type ModuleStatus } from "@/components/jarvis/modules-ring"
import { EventsPanel, type EventEntry } from "@/components/jarvis/events-panel"
import { ActionsPanel, type ActionEntry } from "@/components/jarvis/actions-panel"
import { TerminalConsole, type LogEntry } from "@/components/jarvis/terminal-console"
import { FailuresPanel, type FailureEntry } from "@/components/jarvis/failures-panel"
import { SimulatorPanel, type Simulation } from "@/components/jarvis/simulator-panel"
import { ContextCard, type ClientContext } from "@/components/jarvis/context-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, AlertTriangle, Terminal, Settings } from "lucide-react"

// Flow configurations
const FLOWS: Record<string, { 
  module: string
  states: { state: JarvisState; text: string; duration: number }[]
  actions: string[]
  logs: { level: LogEntry["level"]; code: string; message?: string }[]
}> = {
  "tv-lg": {
    module: "instalacao",
    states: [
      { state: "receiving", text: "Recebendo resposta do cliente", duration: 500 },
      { state: "interpreting", text: "Interpretando intenção", duration: 600 },
      { state: "detecting", text: "Detectando aparelho: LG", duration: 500 },
      { state: "preparing", text: "Preparando fluxo de instalação", duration: 400 },
      { state: "executing", text: "Executando automação", duration: 800 },
      { state: "validating", text: "Validando envio", duration: 400 },
      { state: "completed", text: "Instalação LG pronta para envio", duration: 2000 },
    ],
    actions: [
      "Detectando aparelho LG",
      "Preparando instrução LG",
      "Enviando instalação LG",
    ],
    logs: [
      { level: "info", code: "EVENT_RECEIVED_DEVICE_LG", message: "Cliente respondeu: TV LG" },
      { level: "info", code: "INTENT_CLASSIFIED_INSTALLATION" },
      { level: "info", code: "FLOW_SELECTED_LG_INSTALLATION" },
      { level: "success", code: "ACTION_PREPARED_SEND_INSTALLATION" },
      { level: "success", code: "DISPATCH_READY" },
    ],
  },
  "teste-gerado": {
    module: "teste",
    states: [
      { state: "receiving", text: "Recebendo teste gerado", duration: 400 },
      { state: "interpreting", text: "Classificando evento", duration: 500 },
      { state: "preparing", text: "Preparando mensagem de teste", duration: 500 },
      { state: "executing", text: "Disparando fluxo de teste", duration: 600 },
      { state: "completed", text: "Teste enviado com sucesso", duration: 2000 },
    ],
    actions: [
      "Recebendo teste #0001",
      "Preparando mensagem",
      "Disparando fluxo de teste",
    ],
    logs: [
      { level: "info", code: "EVENT_RECEIVED_TEST_GENERATED", message: "Teste #0001" },
      { level: "info", code: "TEST_FLOW_STARTED" },
      { level: "success", code: "TEST_MESSAGE_DISPATCHED" },
    ],
  },
  "audio-falhou": {
    module: "reenvio",
    states: [
      { state: "receiving", text: "Recebendo falha de áudio", duration: 400 },
      { state: "interpreting", text: "Analisando falha", duration: 600 },
      { state: "failed", text: "Falha detectada: Áudio 4", duration: 800 },
      { state: "retry", text: "Preparando reenvio", duration: 500 },
      { state: "executing", text: "Reenviando áudio 4", duration: 700 },
      { state: "completed", text: "Áudio 4 reenviado", duration: 2000 },
    ],
    actions: [
      "Identificando falha",
      "Preparando retry áudio 4",
      "Reenviando áudio 4",
    ],
    logs: [
      { level: "error", code: "WELCOME_AUDIO_4_FAILED", message: "Timeout na conexão" },
      { level: "warning", code: "RETRY_INITIATED" },
      { level: "success", code: "WELCOME_AUDIO_4_RETRIED" },
    ],
  },
  "ja-paguei": {
    module: "cobranca",
    states: [
      { state: "receiving", text: "Recebendo mensagem do cliente", duration: 400 },
      { state: "interpreting", text: "Interpretando: pagamento", duration: 600 },
      { state: "preparing", text: "Verificando status", duration: 500 },
      { state: "executing", text: "Atualizando cobrança", duration: 600 },
      { state: "completed", text: "Pagamento confirmado", duration: 2000 },
    ],
    actions: [
      "Verificando pagamento",
      "Atualizando status",
      "Confirmando recebimento",
    ],
    logs: [
      { level: "info", code: "EVENT_RECEIVED_PAYMENT_CLAIM", message: "Cliente disse: Já paguei" },
      { level: "info", code: "PAYMENT_STATUS_CHECKING" },
      { level: "success", code: "PAYMENT_CONFIRMED" },
    ],
  },
  "quero-ativar": {
    module: "boas-vindas",
    states: [
      { state: "receiving", text: "Recebendo solicitação", duration: 400 },
      { state: "interpreting", text: "Classificando: ativação", duration: 500 },
      { state: "preparing", text: "Preparando boas-vindas", duration: 500 },
      { state: "executing", text: "Enviando sequência", duration: 1000 },
      { state: "completed", text: "Boas-vindas iniciadas", duration: 2000 },
    ],
    actions: [
      "Iniciando boas-vindas",
      "Enviando áudio 1",
      "Enviando áudio 2",
      "Enviando prova social",
    ],
    logs: [
      { level: "info", code: "EVENT_RECEIVED_ACTIVATION", message: "Quero ativar" },
      { level: "info", code: "WELCOME_FLOW_STARTED" },
      { level: "success", code: "WELCOME_AUDIO_1_SENT" },
      { level: "success", code: "WELCOME_AUDIO_2_SENT" },
    ],
  },
  "lista-nao-carrega": {
    module: "suporte",
    states: [
      { state: "receiving", text: "Recebendo problema", duration: 400 },
      { state: "interpreting", text: "Classificando problema", duration: 600 },
      { state: "preparing", text: "Buscando solução", duration: 700 },
      { state: "executing", text: "Enviando resposta", duration: 500 },
      { state: "completed", text: "Suporte enviado", duration: 2000 },
    ],
    actions: [
      "Classificando problema",
      "Buscando solução",
      "Enviando resposta",
    ],
    logs: [
      { level: "warning", code: "EVENT_RECEIVED_ISSUE", message: "Lista não carrega" },
      { level: "info", code: "ISSUE_CLASSIFIED_LIST_ERROR" },
      { level: "success", code: "SUPPORT_RESPONSE_SENT" },
    ],
  },
}

export default function JarvisPage() {
  const [tab, setTab] = useState("central")
  const [jarvisState, setJarvisState] = useState<JarvisState>("idle")
  const [statusText, setStatusText] = useState("Aguardando evento")
  const [activeModule, setActiveModule] = useState<string | undefined>()
  const [modules, setModules] = useState(getDefaultModules())
  const [events, setEvents] = useState<EventEntry[]>([])
  const [actions, setActions] = useState<ActionEntry[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [failures, setFailures] = useState<FailureEntry[]>([])
  const [clientContext, setClientContext] = useState<ClientContext | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [commandInput, setCommandInput] = useState("")

  // Update module status
  const updateModuleStatus = useCallback((moduleId: string, status: ModuleStatus) => {
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, status } : m))
  }, [])

  // Add log
  const addLog = useCallback((level: LogEntry["level"], code: string, message?: string) => {
    setLogs(prev => [{
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      code,
      message,
    }, ...prev].slice(0, 100))
  }, [])

  // Simulate event
  const handleSimulate = useCallback(async (simulation: Simulation) => {
    if (isSimulating) return
    setIsSimulating(true)

    const flow = FLOWS[simulation.id]
    if (!flow) {
      setIsSimulating(false)
      return
    }

    const eventId = `evt-${Date.now()}`
    const now = new Date()

    // Add event
    setEvents(prev => [{
      id: eventId,
      text: `Cliente respondeu: "${simulation.label}"`,
      timestamp: now,
      type: simulation.type,
    }, ...prev].slice(0, 20))

    // Set client context
    setClientContext({
      name: "João Silva",
      phone: "(22) 9****-1234",
      app: "XCloud",
      device: simulation.id === "tv-lg" ? "LG" : "Detectando...",
      origin: "Painel / Teste #0001",
      currentFlow: flow.module.charAt(0).toUpperCase() + flow.module.slice(1),
    })

    // Process states
    let logIndex = 0
    let actionIndex = 0
    for (const step of flow.states) {
      setJarvisState(step.state)
      setStatusText(step.text)
      setActiveModule(flow.module)

      // Update module status
      if (step.state === "executing" || step.state === "retry") {
        updateModuleStatus(flow.module, "processing")
      } else if (step.state === "failed") {
        updateModuleStatus(flow.module, "failed")
      } else if (step.state === "completed") {
        updateModuleStatus(flow.module, "completed")
      }

      // Add log if available
      if (flow.logs[logIndex]) {
        addLog(flow.logs[logIndex].level, flow.logs[logIndex].code, flow.logs[logIndex].message)
        logIndex++
      }

      // Add action during executing state
      if ((step.state === "executing" || step.state === "preparing" || step.state === "detecting") && flow.actions[actionIndex]) {
        const actionId = `action-${Date.now()}-${actionIndex}`
        setActions(prev => [{
          id: actionId,
          text: flow.actions[actionIndex],
          timestamp: new Date(),
          status: "executing",
        }, ...prev].slice(0, 20))
        
        setTimeout(() => {
          setActions(prev => prev.map(a => a.id === actionId ? { ...a, status: "completed" } : a))
        }, step.duration - 100)
        
        actionIndex++
      }

      await new Promise(r => setTimeout(r, step.duration))
    }

    // Add remaining actions if any
    while (actionIndex < flow.actions.length) {
      const actionId = `action-${Date.now()}-${actionIndex}`
      setActions(prev => [{
        id: actionId,
        text: flow.actions[actionIndex],
        timestamp: new Date(),
        status: "completed",
      }, ...prev].slice(0, 20))
      actionIndex++
      await new Promise(r => setTimeout(r, 200))
    }

    // Handle failure for audio scenario
    if (simulation.id === "audio-falhou" && Math.random() > 0.7) {
      setFailures(prev => [{
        id: `fail-${Date.now()}`,
        text: "Áudio 4 falhou novamente",
        timestamp: new Date(),
        retryCount: 2,
      }, ...prev])
    }

    // Reset after delay
    await new Promise(r => setTimeout(r, 2000))
    setJarvisState("idle")
    setStatusText("Aguardando evento")
    setActiveModule(undefined)
    updateModuleStatus(flow.module, "ready")
    setIsSimulating(false)
  }, [isSimulating, addLog, updateModuleStatus])

  // Handle failure actions
  const handleRetry = useCallback((id: string) => {
    const failure = failures.find(f => f.id === id)
    if (failure) {
      setFailures(prev => prev.filter(f => f.id !== id))
      handleSimulate({ id: "audio-falhou", label: "Áudio 4 falhou", icon: null, type: "audio" } as Simulation)
    }
  }, [failures, handleSimulate])

  const handleSkip = useCallback((id: string) => {
    setFailures(prev => prev.filter(f => f.id !== id))
    addLog("warning", "FAILURE_SKIPPED", "Falha ignorada pelo operador")
  }, [addLog])

  const handleResolve = useCallback((id: string) => {
    setFailures(prev => prev.filter(f => f.id !== id))
    addLog("success", "FAILURE_RESOLVED", "Marcado como resolvido")
  }, [addLog])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient background glow - premium depth */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-chart-5/[0.02]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/[0.03] rounded-full blur-[120px]" />
      </div>

      {/* Header - premium Central Play Plus style */}
      <header className="relative border-b border-border/60 bg-gradient-to-r from-card/90 via-card/95 to-card/90 backdrop-blur-md sticky top-0 z-50">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.02] to-transparent" />
        <div className="relative max-w-[1920px] mx-auto px-8 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-chart-2/10 border border-chart-2/20">
              <div className="w-2 h-2 rounded-full bg-chart-2 pulse-dot glow-green" />
              <span className="text-xs font-semibold text-chart-2 tracking-wide">ATIVO</span>
            </div>
            <div className="h-6 w-px bg-border/40" />
            <div className="flex items-center gap-3">
              <span className="text-base font-bold tracking-tight text-foreground">Central Play</span>
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">Plus</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-secondary/60 border border-border/60 hover:bg-secondary hover:border-border transition-all cursor-pointer">
            <Settings className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        {/* Tab navigation - elegant style */}
        <div className="relative border-b border-border/50 bg-card/20 backdrop-blur-sm">
          <div className="max-w-[1920px] mx-auto px-8">
            <TabsList className="h-14 bg-transparent gap-2 p-0">
              <TabsTrigger
                value="central"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-lg rounded-b-none px-6 gap-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all"
              >
                <Activity className="w-4 h-4" />
                <span className="font-medium">Central</span>
              </TabsTrigger>
              <TabsTrigger
                value="falhas"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-lg rounded-b-none px-6 gap-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all"
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="font-medium">Falhas</span>
                {failures.length > 0 && (
                  <span className="ml-1.5 px-2 py-0.5 text-[10px] bg-destructive text-white rounded-full font-bold">
                    {failures.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="console"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-t-lg rounded-b-none px-6 gap-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary/30 transition-all"
              >
                <Terminal className="w-4 h-4" />
                <span className="font-medium">Console</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Central Tab - premium layout */}
        <TabsContent value="central" className="mt-0">
          <div className="relative max-w-[1920px] mx-auto">
            <div className="grid grid-cols-12 min-h-[calc(100vh-142px)]">
              {/* Left - Events - lighter design */}
              <div className="col-span-12 lg:col-span-2 border-r border-border/40 bg-gradient-to-b from-card/30 to-transparent">
                <EventsPanel events={events} />
              </div>

              {/* Center - JARVIS Core */}
              <div className="col-span-12 lg:col-span-8 flex flex-col">
                {/* Main command center with ambient glow */}
                <div className="flex-1 relative flex items-center justify-center py-12 min-h-[580px]">
                  {/* Central ambient glow */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-[100px]" />
                  
                  {/* Modules ring */}
                  <ModulesRing modules={modules} activeModuleId={activeModule} />
                  
                  {/* JARVIS Core */}
                  <JarvisCore 
                    state={jarvisState} 
                    statusText={statusText}
                    activeModule={activeModule}
                  />
                </div>

                {/* Bottom section - refined cards */}
                <div className="border-t border-border/40 p-8 bg-gradient-to-t from-card/40 to-transparent">
                  <div className="grid grid-cols-12 gap-6">
                    {/* Simulator */}
                    <div className="col-span-12 lg:col-span-5">
                      <SimulatorPanel 
                        onSimulate={handleSimulate}
                        disabled={isSimulating}
                      />
                    </div>

                    {/* Context */}
                    <div className="col-span-12 lg:col-span-3">
                      <ContextCard context={clientContext} />
                    </div>

                    {/* Mini terminal */}
                    <div className="col-span-12 lg:col-span-4">
                      <TerminalConsole 
                        logs={logs.slice(0, 6)}
                        commandInput={commandInput}
                        onCommandChange={setCommandInput}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right - Actions - lighter design */}
              <div className="col-span-12 lg:col-span-2 border-l border-border/40 bg-gradient-to-b from-card/30 to-transparent">
                <ActionsPanel actions={actions} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Falhas Tab */}
        <TabsContent value="falhas" className="mt-0">
          <div className="max-w-[1000px] mx-auto p-6">
            <FailuresPanel 
              failures={failures}
              onRetry={handleRetry}
              onSkip={handleSkip}
              onResolve={handleResolve}
            />
          </div>
        </TabsContent>

        {/* Console Tab */}
        <TabsContent value="console" className="mt-0">
          <div className="max-w-[1400px] mx-auto p-6">
            <TerminalConsole 
              logs={logs}
              commandInput={commandInput}
              onCommandChange={setCommandInput}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
