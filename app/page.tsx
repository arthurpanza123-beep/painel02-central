"use client"

import { useState, useCallback } from "react"
import { HeaderOrquestrador } from "@/components/orquestrador/header-orquestrador"
import { OrquestradorOrb, OrquestradorStatus } from "@/components/orquestrador/orquestrador-orb"
import { EntradasPanel, type EventoEntrada } from "@/components/orquestrador/entradas-panel"
import { SaidasPanel, type AcaoSaida } from "@/components/orquestrador/saidas-panel"
import { WorkersRing, type Worker, type WorkerStatus } from "@/components/orquestrador/workers-ring"
import { FilaExecucoes, type Execucao } from "@/components/orquestrador/fila-execucoes"
import { ContextoPanel, type ClienteContexto } from "@/components/orquestrador/contexto-panel"
import { SimuladorEventos } from "@/components/orquestrador/simulador-eventos"
import { LogsTerminal, type LogEntry } from "@/components/orquestrador/logs-terminal"
import { FalhasRetry, type Falha } from "@/components/orquestrador/falhas-retry"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, ListTodo, AlertTriangle, Terminal } from "lucide-react"

// Initial workers
const WORKERS_INITIAL: Worker[] = [
  { id: "boas-vindas", nome: "Boas-vindas", status: "idle", icon: "boas-vindas" },
  { id: "instalacao", nome: "Instalação", status: "idle", icon: "instalacao" },
  { id: "teste", nome: "Teste", status: "idle", icon: "teste" },
  { id: "cobranca", nome: "Cobrança", status: "idle", icon: "cobranca" },
  { id: "suporte", nome: "Suporte", status: "idle", icon: "suporte" },
  { id: "reenvio", nome: "Reenvio", status: "idle", icon: "reenvio" },
]

// Initial client context
const CLIENTE_INICIAL: ClienteContexto = {
  nome: "João Silva",
  telefone: "(22) 99999-1234",
  app: "XCloud",
  aparelho: "LG",
  testeVinculado: "Teste #0001",
  statusAtual: "Aguardando instalação",
  ultimaEntrada: "TV LG",
  ultimaSaida: "Instruções LG enviadas",
}

// Flow mapping for events
const FLOW_MAP: Record<string, { worker: string; acoes: string[]; logs: string[] }> = {
  dispositivo: {
    worker: "instalacao",
    acoes: ["Detectando aparelho", "Preparando instrução", "Enviando instalação"],
    logs: ["EVENT_RECEIVED_DEVICE", "FLOW_SELECTED_INSTALLATION", "INSTALLATION_MESSAGE_PREPARED", "INSTALLATION_DISPATCHED"],
  },
  pagamento: {
    worker: "cobranca",
    acoes: ["Verificando pagamento", "Atualizando status", "Confirmando recebimento"],
    logs: ["EVENT_RECEIVED_PAYMENT", "FLOW_SELECTED_BILLING", "PAYMENT_VERIFIED", "BILLING_STATUS_UPDATED"],
  },
  audio_falhou: {
    worker: "reenvio",
    acoes: ["Identificando falha", "Preparando retry", "Reenviando áudio"],
    logs: ["EVENT_RECEIVED_FAILURE", "WELCOME_AUDIO_4_FAILED", "WELCOME_AUDIO_4_RETRY", "AUDIO_RETRY_DISPATCHED"],
  },
  teste: {
    worker: "teste",
    acoes: ["Recebendo teste", "Preparando mensagem", "Disparando fluxo"],
    logs: ["EVENT_RECEIVED_TEST", "TEST_FLOW_STARTED", "TEST_MESSAGE_PREPARED", "TEST_MESSAGE_DISPATCHED"],
  },
  ativacao: {
    worker: "boas-vindas",
    acoes: ["Iniciando boas-vindas", "Enviando áudio 1", "Enviando áudio 2", "Enviando prova social"],
    logs: ["EVENT_RECEIVED_ACTIVATION", "WELCOME_FLOW_STARTED", "WELCOME_AUDIO_1_SENT", "WELCOME_AUDIO_2_SENT"],
  },
  problema: {
    worker: "suporte",
    acoes: ["Classificando problema", "Buscando solução", "Enviando resposta"],
    logs: ["EVENT_RECEIVED_ISSUE", "ISSUE_CLASSIFIED", "SUPPORT_RESPONSE_PREPARED", "SUPPORT_DISPATCHED"],
  },
}

export default function OrquestradorPage() {
  const [tab, setTab] = useState("central")
  const [orbState, setOrbState] = useState<{ status: "idle" | "receiving" | "interpreting" | "classifying" | "routing" | "executing" | "validating" | "success" | "failed" | "retrying"; message?: string }>({ status: "idle" })
  const [workers, setWorkers] = useState<Worker[]>(WORKERS_INITIAL)
  const [eventos, setEventos] = useState<EventoEntrada[]>([])
  const [acoes, setAcoes] = useState<AcaoSaida[]>([])
  const [execucoes, setExecucoes] = useState<Execucao[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [falhas, setFalhas] = useState<Falha[]>([])
  const [cliente, setCliente] = useState<ClienteContexto>(CLIENTE_INICIAL)
  const [isSimulating, setIsSimulating] = useState(false)

  // Add log entry
  const addLog = useCallback((level: LogEntry["level"], code: string, message?: string) => {
    setLogs(prev => [...prev, {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      level,
      code,
      message,
    }])
  }, [])

  // Update worker status
  const updateWorker = useCallback((workerId: string, status: WorkerStatus) => {
    setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, status } : w))
  }, [])

  // Simulate event flow
  const handleSimularEvento = useCallback(async (tipo: string, mensagem: string) => {
    setIsSimulating(true)
    const flow = FLOW_MAP[tipo] || FLOW_MAP.dispositivo
    const eventoId = `evt-${Date.now()}`
    const now = new Date()

    // 1. Event enters
    const novoEvento: EventoEntrada = {
      id: eventoId,
      tipo: tipo as EventoEntrada["tipo"],
      mensagem,
      timestamp: now,
      status: "entering",
    }
    setEventos(prev => [novoEvento, ...prev].slice(0, 10))
    setOrbState({ status: "receiving", message: mensagem })
    addLog("info", flow.logs[0] || "EVENT_RECEIVED", mensagem)

    await new Promise(r => setTimeout(r, 600))

    // 2. Processing
    setEventos(prev => prev.map(e => e.id === eventoId ? { ...e, status: "processing" } : e))
    setOrbState({ status: "interpreting", message: "Interpretando contexto..." })
    
    await new Promise(r => setTimeout(r, 500))
    setOrbState({ status: "classifying", message: "Classificando evento..." })
    addLog("info", flow.logs[1] || "FLOW_SELECTED")
    
    await new Promise(r => setTimeout(r, 500))
    setOrbState({ status: "routing", message: `Roteando para ${flow.worker}...` })
    
    // 3. Activate worker
    await new Promise(r => setTimeout(r, 400))
    updateWorker(flow.worker, "processing")
    setOrbState({ status: "executing", message: "Executando fluxo..." })

    // Add execution to queue
    const execucaoId = `exec-${Date.now()}`
    setExecucoes(prev => [{
      id: execucaoId,
      fluxo: flow.worker.charAt(0).toUpperCase() + flow.worker.slice(1),
      descricao: mensagem,
      status: "running",
      progresso: 0,
      timestamp: now,
    }, ...prev].slice(0, 8))

    // 4. Dispatch actions
    for (let i = 0; i < flow.acoes.length; i++) {
      await new Promise(r => setTimeout(r, 400))
      
      const acaoId = `acao-${Date.now()}-${i}`
      const novaAcao: AcaoSaida = {
        id: acaoId,
        tipo: "mensagem",
        descricao: flow.acoes[i],
        timestamp: new Date(),
        status: "dispatching",
      }
      setAcoes(prev => [novaAcao, ...prev].slice(0, 10))
      addLog("success", flow.logs[i + 2] || `ACTION_${i + 1}_DISPATCHED`)
      
      // Update progress
      setExecucoes(prev => prev.map(e => 
        e.id === execucaoId 
          ? { ...e, progresso: Math.round(((i + 1) / flow.acoes.length) * 100) }
          : e
      ))

      await new Promise(r => setTimeout(r, 300))
      setAcoes(prev => prev.map(a => a.id === acaoId ? { ...a, status: "sent" } : a))
    }

    // 5. Complete
    await new Promise(r => setTimeout(r, 400))
    setOrbState({ status: "validating", message: "Validando retorno..." })
    
    // Simulate occasional failure
    const shouldFail = tipo === "audio_falhou" && Math.random() > 0.5

    await new Promise(r => setTimeout(r, 500))
    
    if (shouldFail) {
      setOrbState({ status: "failed", message: "Falha no envio" })
      updateWorker(flow.worker, "failed")
      setExecucoes(prev => prev.map(e => 
        e.id === execucaoId ? { ...e, status: "failed" } : e
      ))
      addLog("error", "FLOW_FAILED", "Erro no envio de mídia")
      
      // Add to failures
      setFalhas(prev => [{
        id: `falha-${Date.now()}`,
        fluxo: flow.worker.charAt(0).toUpperCase() + flow.worker.slice(1),
        etapa: flow.acoes[flow.acoes.length - 1],
        erro: "MEDIA_SEND_FAILED - Timeout na conexão",
        timestamp: new Date(),
        tentativas: 1,
      }, ...prev])
    } else {
      setOrbState({ status: "success", message: "Fluxo concluído!" })
      updateWorker(flow.worker, "success")
      setExecucoes(prev => prev.map(e => 
        e.id === execucaoId ? { ...e, status: "success" } : e
      ))
      addLog("success", "FLOW_COMPLETED", `${flow.worker} finalizado com sucesso`)
    }

    setEventos(prev => prev.map(e => e.id === eventoId ? { ...e, status: "processed" } : e))

    // Update client context
    if (tipo === "dispositivo") {
      const aparelho = mensagem.includes("LG") ? "LG" : mensagem.includes("Samsung") ? "Samsung" : "Fire Stick"
      setCliente(prev => ({
        ...prev,
        aparelho,
        ultimaEntrada: mensagem,
        ultimaSaida: `Instruções ${aparelho} enviadas`,
        statusAtual: "Instalação enviada",
      }))
    }

    // Reset after delay
    await new Promise(r => setTimeout(r, 2000))
    setOrbState({ status: "idle" })
    updateWorker(flow.worker, "idle")
    setIsSimulating(false)
  }, [addLog, updateWorker])

  // Handle retry
  const handleRetry = useCallback((falha: Falha) => {
    setFalhas(prev => prev.filter(f => f.id !== falha.id))
    handleSimularEvento("audio_falhou", `Retry: ${falha.etapa}`)
  }, [handleSimularEvento])

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <HeaderOrquestrador origem="Painel Gestão / Teste #0001" />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        {/* Tab navigation */}
        <div className="border-b border-border/50 bg-card/30">
          <div className="max-w-[1800px] mx-auto px-6">
            <TabsList className="h-12 bg-transparent gap-1 p-0">
              <TabsTrigger
                value="central"
                className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary/30 border border-transparent px-4 gap-2"
              >
                <Activity className="w-4 h-4" />
                Central
              </TabsTrigger>
              <TabsTrigger
                value="execucoes"
                className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary/30 border border-transparent px-4 gap-2"
              >
                <ListTodo className="w-4 h-4" />
                Execuções
              </TabsTrigger>
              <TabsTrigger
                value="falhas"
                className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary/30 border border-transparent px-4 gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Falhas & Retry
                {falhas.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-destructive/20 text-destructive rounded">
                    {falhas.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="logs"
                className="data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:border-primary/30 border border-transparent px-4 gap-2"
              >
                <Terminal className="w-4 h-4" />
                Logs
              </TabsTrigger>
            </TabsList>
          </div>
        </div>

        {/* Central Tab - Main command center view */}
        <TabsContent value="central" className="mt-0">
          <div className="max-w-[1800px] mx-auto p-6">
            <div className="grid grid-cols-12 gap-6 min-h-[calc(100vh-180px)]">
              {/* Left column - Entradas */}
              <div className="col-span-12 lg:col-span-2">
                <EntradasPanel eventos={eventos} className="h-full" />
              </div>

              {/* Center - Orquestrador + Workers */}
              <div className="col-span-12 lg:col-span-8">
                <div className="relative flex items-center justify-center min-h-[500px]">
                  {/* Workers ring */}
                  <WorkersRing workers={workers} />
                  
                  {/* Central Orb */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <OrquestradorOrb state={orbState} />
                    <OrquestradorStatus state={orbState} />
                  </div>
                </div>

                {/* Fila de execuções (compact) */}
                <div className="mt-6">
                  <FilaExecucoes 
                    execucoes={execucoes.slice(0, 4)} 
                    onRetry={(e) => handleSimularEvento("audio_falhou", `Retry: ${e.descricao}`)}
                  />
                </div>
              </div>

              {/* Right column - Saídas */}
              <div className="col-span-12 lg:col-span-2">
                <SaidasPanel acoes={acoes} className="h-full" />
              </div>
            </div>

            {/* Bottom row - Simulator and Context */}
            <div className="grid grid-cols-12 gap-6 mt-6">
              <div className="col-span-12 lg:col-span-4">
                <SimuladorEventos 
                  onSimular={handleSimularEvento} 
                  isSimulating={isSimulating}
                />
              </div>
              <div className="col-span-12 lg:col-span-4">
                <ContextoPanel cliente={cliente} origem="Painel Gestão / Teste #0001" />
              </div>
              <div className="col-span-12 lg:col-span-4">
                <LogsTerminal logs={logs.slice(0, 15)} className="h-full" />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Execuções Tab */}
        <TabsContent value="execucoes" className="mt-0">
          <div className="max-w-[1400px] mx-auto p-6">
            <FilaExecucoes 
              execucoes={execucoes} 
              onRetry={(e) => handleSimularEvento("audio_falhou", `Retry: ${e.descricao}`)}
            />
          </div>
        </TabsContent>

        {/* Falhas Tab */}
        <TabsContent value="falhas" className="mt-0">
          <div className="max-w-[1200px] mx-auto p-6">
            <FalhasRetry 
              falhas={falhas}
              onRetry={handleRetry}
              onSkip={(f) => setFalhas(prev => prev.filter(x => x.id !== f.id))}
              onMarcarConcluido={(f) => setFalhas(prev => prev.filter(x => x.id !== f.id))}
            />
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-0">
          <div className="max-w-[1400px] mx-auto p-6">
            <LogsTerminal logs={logs} className="h-[calc(100vh-220px)]" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
