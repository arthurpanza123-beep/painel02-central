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
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-chart-2 pulse-dot" />
              <span className="text-xs font-mono text-muted-foreground">SISTEMA ATIVO</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm text-foreground">Central Play+ — Orquestrador</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">
              {new Date().toLocaleTimeString("pt-BR")}
            </span>
            <Settings className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </header>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        {/* Tab navigation */}
        <div className="border-b border-border/50 bg-card/20">
          <div className="max-w-[1920px] mx-auto px-6">
            <TabsList className="h-11 bg-transparent gap-1 p-0">
              <TabsTrigger
                value="central"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 gap-2"
              >
                <Activity className="w-4 h-4" />
                Central
              </TabsTrigger>
              <TabsTrigger
                value="falhas"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Falhas
                {failures.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-destructive text-white rounded">
                    {failures.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="console"
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 gap-2"
              >
                <Terminal className="w-4 h-4" />
                Console
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Central Tab */}
        <TabsContent value="central" className="mt-0">
          <div className="max-w-[1920px] mx-auto">
            <div className="grid grid-cols-12 min-h-[calc(100vh-120px)]">
              {/* Left - Events */}
              <div className="col-span-12 lg:col-span-2 border-r border-border/30 bg-card/20">
                <EventsPanel events={events} />
              </div>

              {/* Center - JARVIS Core */}
              <div className="col-span-12 lg:col-span-8 flex flex-col">
                {/* Main command center */}
                <div className="flex-1 relative flex items-center justify-center py-8">
                  {/* Modules ring */}
                  <ModulesRing modules={modules} activeModuleId={activeModule} />
                  
                  {/* JARVIS Core */}
                  <JarvisCore 
                    state={jarvisState} 
                    statusText={statusText}
                    activeModule={activeModule}
                  />
                </div>

                {/* Bottom section */}
                <div className="border-t border-border/30 p-6 bg-card/10">
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
                        logs={logs.slice(0, 8)}
                        commandInput={commandInput}
                        onCommandChange={setCommandInput}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right - Actions */}
              <div className="col-span-12 lg:col-span-2 border-l border-border/30 bg-card/20">
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
