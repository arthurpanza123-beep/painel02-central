"use client"

import { Suspense, useState, useCallback, useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Activity, AlertTriangle, Terminal, Settings, Zap, Tv, MessageSquare, 
  RefreshCw, CreditCard, Sparkles, HelpCircle, Clock, History, Monitor, BarChart3,
  User, Layers, Play, Pause, CheckCircle2, XCircle, Loader2, ListOrdered, Cloud
} from "lucide-react"

// Types
type JarvisState = "idle" | "receiving" | "interpreting" | "detecting" | "preparing" | "executing" | "validating" | "completed" | "failed" | "retry"
type LogEntry = { id: string; timestamp: Date; level: "info" | "success" | "warning" | "error"; code: string; detail?: string }
type QueueItem = { id: string; simId: string; label: string; addedAt: Date; status: "queued" | "processing" | "completed" | "failed" }
type FailureEntry = { id: string; timestamp: Date; code: string; message: string; resolved: boolean }
type EvolutionUiResult = {
  ok?: boolean
  code?: string
  message?: string
  dryRun?: boolean
  preview?: string
  flags?: { enabled?: boolean; dryRun?: boolean; configured?: boolean }
  logs?: Array<{ code?: string; message?: string }>
}

type FlowConfig = {
  module: string
  preview: string
  states: { state: JarvisState; text: string; duration: number }[]
  logs: { level: LogEntry["level"]; code: string; detail?: string }[]
}

function flow(module: string, preview: string, states: FlowConfig["states"], logs: FlowConfig["logs"]): FlowConfig {
  return { module, preview, states, logs }
}

// Flow configurations. Todos os fluxos abaixo sao simulados: nao enviam WhatsApp e nao chamam Evolution.
const FLOWS: Record<string, FlowConfig> = {
  test_created: flow(
    "Teste",
    "Preview: teste criado, orientar instalacao e acompanhar 1h15 sem disparo real.",
    [
      { state: "receiving", text: "Recebendo teste criado", duration: 400 },
      { state: "interpreting", text: "Lendo contexto do Painel 1", duration: 500 },
      { state: "preparing", text: "Preparando preview de boas-vindas", duration: 600 },
      { state: "completed", text: "Preview pronto", duration: 1800 },
    ],
    [
      { level: "info", code: "FLOW_TEST_CREATED", detail: "Evento recebido via simulador/query" },
      { level: "info", code: "WHATSAPP_PREVIEW_ONLY", detail: "Nenhum envio real executado" },
      { level: "success", code: "TEMPLATE_READY", detail: "Mensagem visual preparada" },
    ],
  ),
  test_expired: flow(
    "Teste expirado",
    "Preview: aviso de expiracao, figurinha, entrar no painel e remover XCloud se aplicavel.",
    [
      { state: "receiving", text: "Teste expirado detectado", duration: 400 },
      { state: "preparing", text: "Preparando aviso e figurinha", duration: 650 },
      { state: "executing", text: "Montando acoes do operador", duration: 650 },
      { state: "completed", text: "Checklist visual pronto", duration: 1800 },
    ],
    [
      { level: "warning", code: "TEST_EXPIRED", detail: "Expiracao simulada" },
      { level: "info", code: "STICKER_PREVIEW", detail: "Figurinha apenas em preview" },
      { level: "info", code: "ACTION_ENTER_PANEL", detail: "Botao visual para entrar no painel" },
      { level: "info", code: "ACTION_REMOVE_XCLOUD", detail: "Remocao XCloud somente simulada" },
    ],
  ),
  access_activated: flow(
    "Acesso ativado",
    "Preview: acesso ativado com sucesso, plano, validade e orientacoes.",
    [
      { state: "receiving", text: "Acesso ativado recebido", duration: 400 },
      { state: "interpreting", text: "Conferindo plano e validade", duration: 500 },
      { state: "preparing", text: "Preparando mensagem de ativacao", duration: 650 },
      { state: "completed", text: "Preview de acesso ativado pronto", duration: 1800 },
    ],
    [
      { level: "success", code: "ACCESS_ACTIVATED", detail: "Ativacao registrada" },
      { level: "info", code: "PLAN_CONFIRMED", detail: "Plano e validade confirmados" },
      { level: "success", code: "MESSAGE_READY", detail: "Mensagem pronta para envio" },
    ],
  ),
  renewal_created: flow(
    "Renovacao",
    "Preview: cobranca de renovacao com dados visuais e sem envio real.",
    [
      { state: "receiving", text: "Renovacao criada", duration: 400 },
      { state: "interpreting", text: "Conferindo plano e vencimento", duration: 500 },
      { state: "preparing", text: "Preparando cobranca visual", duration: 650 },
      { state: "completed", text: "Preview de renovacao pronto", duration: 1800 },
    ],
    [
      { level: "info", code: "RENEWAL_CREATED", detail: "Renovacao adicionada ao console" },
      { level: "info", code: "CHARGE_PREVIEW", detail: "Cobranca nao enviada" },
      { level: "success", code: "OPERATOR_READY", detail: "Operador pode copiar manualmente" },
    ],
  ),
  app_swap: flow(
    "Troca de app",
    "Preview: instrucoes de troca de aplicativo e midias sugeridas.",
    [
      { state: "receiving", text: "Pedido de troca recebido", duration: 400 },
      { state: "detecting", text: "Identificando app atual", duration: 500 },
      { state: "preparing", text: "Selecionando novo tutorial", duration: 650 },
      { state: "completed", text: "Troca preparada", duration: 1800 },
    ],
    [
      { level: "info", code: "APP_SWAP", detail: "Fluxo visual de troca" },
      { level: "info", code: "MEDIA_TEMPLATE_SELECTED", detail: "Midia sugerida, sem envio" },
      { level: "success", code: "SWAP_PREVIEW_READY", detail: "Instrucoes prontas" },
    ],
  ),
  second_screen: flow(
    "Segunda tela",
    "Preview: orientar segunda tela, limites e proximo passo de ativacao.",
    [
      { state: "receiving", text: "Solicitacao de segunda tela", duration: 400 },
      { state: "interpreting", text: "Validando contexto visual", duration: 500 },
      { state: "preparing", text: "Preparando orientacao", duration: 650 },
      { state: "completed", text: "Preview de segunda tela pronto", duration: 1800 },
    ],
    [
      { level: "info", code: "SECOND_SCREEN", detail: "Pedido recebido" },
      { level: "warning", code: "MANUAL_CONFIRMATION", detail: "Sem ativacao automatica" },
      { level: "success", code: "GUIDE_READY", detail: "Orientacao visual pronta" },
    ],
  ),
  problem_created: flow(
    "Problema",
    "Preview: problema criado, prompt de conhecimento e proximas acoes para suporte.",
    [
      { state: "receiving", text: "Problema recebido", duration: 400 },
      { state: "interpreting", text: "Classificando ocorrencia", duration: 500 },
      { state: "preparing", text: "Gerando prompt operacional", duration: 700 },
      { state: "completed", text: "Prompt pronto", duration: 1800 },
    ],
    [
      { level: "warning", code: "PROBLEM_CREATED", detail: "Ocorrencia registrada visualmente" },
      { level: "info", code: "CODEX_PROMPT_READY", detail: "Prompt para suporte/Painel 2" },
      { level: "success", code: "KNOWLEDGE_ATTACHED", detail: "Conhecimento sugerido" },
    ],
  ),
  xcloud_remove_device: flow(
    "XCloud",
    "Preview: remover device XCloud com confirmacao manual do operador.",
    [
      { state: "receiving", text: "Remocao solicitada", duration: 400 },
      { state: "detecting", text: "Localizando device", duration: 600 },
      { state: "preparing", text: "Aguardando confirmacao manual", duration: 700 },
      { state: "completed", text: "Remocao simulada pronta", duration: 1800 },
    ],
    [
      { level: "info", code: "XCLOUD_REMOVE_DEVICE", detail: "Nenhuma automacao real disparada" },
      { level: "warning", code: "CONFIRMATION_REQUIRED", detail: "Operador decide no Painel 1/XCloud" },
      { level: "success", code: "CHECKLIST_READY", detail: "Checklist visual pronto" },
    ],
  ),
  xcloud_recreate_device: flow(
    "XCloud",
    "Preview: recriar device XCloud com localizar, desativar, excluir, recriar e confirmar RELOAD.",
    [
      { state: "receiving", text: "Recriacao solicitada", duration: 400 },
      { state: "detecting", text: "Localizando device", duration: 600 },
      { state: "executing", text: "Simulando desativacao", duration: 650 },
      { state: "executing", text: "Simulando exclusao", duration: 650 },
      { state: "preparing", text: "Preparando recriacao", duration: 700 },
      { state: "validating", text: "Confirmando RELOAD visual", duration: 550 },
      { state: "completed", text: "Recriacao simulada pronta", duration: 1800 },
    ],
    [
      { level: "info", code: "XCLOUD_RECREATE_DEVICE", detail: "Fluxo visual iniciado" },
      { level: "info", code: "XCLOUD_DEVICE_FOUND", detail: "Device key lida do contexto" },
      { level: "info", code: "XCLOUD_DEACTIVATE_PREVIEW", detail: "Sem Playwright real aqui" },
      { level: "info", code: "XCLOUD_DELETE_PREVIEW", detail: "Sem exclusao real" },
      { level: "success", code: "XCLOUD_RELOAD_PREVIEW", detail: "Checklist pronto" },
    ],
  ),
  charge_customer: flow(
    "Cobranca",
    "Preview: cobrar cliente com template, valor e vencimento visuais.",
    [
      { state: "receiving", text: "Cobranca solicitada", duration: 400 },
      { state: "interpreting", text: "Lendo valor e vencimento", duration: 500 },
      { state: "preparing", text: "Preparando mensagem de cobranca", duration: 650 },
      { state: "completed", text: "Preview de cobranca pronto", duration: 1800 },
    ],
    [
      { level: "info", code: "CHARGE_CUSTOMER", detail: "Cobranca montada no preview" },
      { level: "info", code: "NO_EVOLUTION_CALL", detail: "Sem chamada HTTP" },
      { level: "success", code: "COPY_READY", detail: "Texto pronto para copia manual" },
    ],
  ),
  install_requested: flow(
    "Instalacao",
    "Preview: pedido de instalacao com midias e passos sugeridos.",
    [
      { state: "receiving", text: "Pedido de instalacao", duration: 400 },
      { state: "detecting", text: "Identificando aparelho", duration: 550 },
      { state: "preparing", text: "Selecionando tutorial", duration: 650 },
      { state: "completed", text: "Instalacao preparada", duration: 1800 },
    ],
    [
      { level: "info", code: "INSTALL_REQUESTED", detail: "Fluxo visual de instalacao" },
      { level: "info", code: "MEDIA_PREVIEW_READY", detail: "Midias sugeridas" },
      { level: "success", code: "INSTALL_GUIDE_READY", detail: "Passos prontos" },
    ],
  ),
  "tv-lg": {
    module: "Instalacao",
    preview: "Preview legado: instalacao LG simulada.",
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
    preview: "Preview legado: reenvio visual de audio.",
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
    preview: "Preview legado: confirmacao visual de pagamento.",
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
    preview: "Preview legado: ativacao visual sem envio.",
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
    preview: "Preview legado: suporte visual para lista.",
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
    preview: "Preview legado: teste simulado.",
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
  "recriar-xcloud": {
    module: "XCloud",
    preview: "Preview legado: recriacao visual XCloud.",
    states: [
      { state: "receiving", text: "Solicitacao recebida", duration: 400 },
      { state: "detecting", text: "Localizando device", duration: 600 },
      { state: "executing", text: "Desativando device", duration: 700 },
      { state: "executing", text: "Excluindo device", duration: 600 },
      { state: "preparing", text: "Recriando device", duration: 800 },
      { state: "executing", text: "Vinculando Xtream", duration: 700 },
      { state: "validating", text: "Confirmando RELOAD", duration: 500 },
      { state: "completed", text: "Device XCloud recriado", duration: 2000 },
    ],
    logs: [
      { level: "info", code: "XCLOUD_RECREATE_REQ", detail: "Solicitacao de recriacao recebida" },
      { level: "info", code: "XCLOUD_DEVICE_FOUND", detail: "Device key localizada" },
      { level: "info", code: "XCLOUD_DEACTIVATED", detail: "Device desativado com sucesso" },
      { level: "info", code: "XCLOUD_DELETED", detail: "Device excluido do sistema" },
      { level: "info", code: "XCLOUD_RECREATED", detail: "Novo device cadastrado" },
      { level: "success", code: "XCLOUD_RELOAD_OK", detail: "RELOAD confirmado" },
    ],
  },
  "falha-xcloud": {
    module: "XCloud",
    preview: "Preview legado: falha visual XCloud com retry.",
    states: [
      { state: "receiving", text: "Solicitacao recebida", duration: 400 },
      { state: "detecting", text: "Localizando device", duration: 500 },
      { state: "executing", text: "Desativando device", duration: 600 },
      { state: "failed", text: "Falha ao deletar device", duration: 800 },
      { state: "retry", text: "Retry Delete", duration: 600 },
      { state: "executing", text: "Excluindo device", duration: 700 },
      { state: "completed", text: "Device deletado apos retry", duration: 2000 },
    ],
    logs: [
      { level: "info", code: "XCLOUD_RECREATE_REQ", detail: "Solicitacao de recriacao recebida" },
      { level: "info", code: "XCLOUD_DEACTIVATED", detail: "Device desativado" },
      { level: "error", code: "XCLOUD_DELETE_FAIL", detail: "Falha ao deletar device" },
      { level: "warning", code: "XCLOUD_RETRY_DEL", detail: "Tentando novamente deletar" },
      { level: "success", code: "XCLOUD_DELETED", detail: "Device excluido apos retry" },
    ],
  },
}

// Simulations
const simulations = [
  { id: "test_created", label: "Teste criado", icon: <Sparkles className="w-4 h-4" /> },
  { id: "test_expired", label: "Teste expirado", icon: <Clock className="w-4 h-4" /> },
  { id: "access_activated", label: "Acesso ativado", icon: <CheckCircle2 className="w-4 h-4" /> },
  { id: "renewal_created", label: "Renovacao", icon: <RefreshCw className="w-4 h-4" /> },
  { id: "app_swap", label: "Trocar app", icon: <Monitor className="w-4 h-4" /> },
  { id: "second_screen", label: "Segunda tela", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "problem_created", label: "Problema", icon: <HelpCircle className="w-4 h-4" /> },
  { id: "xcloud_remove_device", label: "Remover XCloud", icon: <Cloud className="w-4 h-4" /> },
  { id: "xcloud_recreate_device", label: "Recriar XCloud", icon: <Cloud className="w-4 h-4" /> },
  { id: "charge_customer", label: "Cobrar cliente", icon: <CreditCard className="w-4 h-4" /> },
  { id: "install_requested", label: "Instalacao", icon: <Tv className="w-4 h-4" /> },
  { id: "tv-lg", label: "TV LG", icon: <Tv className="w-4 h-4" /> },
  { id: "audio-falhou", label: "Audio falhou", icon: <RefreshCw className="w-4 h-4" /> },
  { id: "ja-paguei", label: "Ja paguei", icon: <CreditCard className="w-4 h-4" /> },
  { id: "quero-ativar", label: "Ativar", icon: <Sparkles className="w-4 h-4" /> },
  { id: "recriar-xcloud", label: "Recriar XCloud", icon: <Cloud className="w-4 h-4" /> },
  { id: "falha-xcloud", label: "Falha XCloud", icon: <AlertTriangle className="w-4 h-4" /> },
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
  { id: "config", label: "Config", icon: Settings },
]

function JarvisPageContent() {
  const searchParams = useSearchParams()
  const hydratedFromQuery = useRef(false)
  const [activeTab, setActiveTab] = useState("central")
  const [jarvisState, setJarvisState] = useState<JarvisState>("idle")
  const [statusText, setStatusText] = useState("Aguardando evento")
  const [lastEvent, setLastEvent] = useState<{ text: string; time: Date } | null>(null)
  const [currentAction, setCurrentAction] = useState<string | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [context, setContext] = useState<{ name: string; device: string; flow: string; preview?: string; source?: string; testId?: string; clientId?: string } | null>(null)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [failures, setFailures] = useState<FailureEntry[]>([])
  const [processedCount, setProcessedCount] = useState(0)
  const [history, setHistory] = useState<{ id: string; label: string; module: string; time: Date; success: boolean }[]>([])
  const [evolutionResult, setEvolutionResult] = useState<EvolutionUiResult | null>(null)
  const [evolutionLoading, setEvolutionLoading] = useState(false)
  const [evolutionPhone, setEvolutionPhone] = useState("")
  const [evolutionFlow, setEvolutionFlow] = useState("test_created")
  const [welcomeStep, setWelcomeStep] = useState("audio_1")
  const [installApp, setInstallApp] = useState("XCloud")
  const [installDevice, setInstallDevice] = useState("LG")

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
          name: searchParams.get("client_name") || searchParams.get("name") || "Cliente em contexto",
          device: searchParams.get("device_key") || (item.simId === "tv-lg" ? "LG" : item.simId === "audio-falhou" ? "Samsung" : item.simId.includes("xcloud") ? "XCloud" : "Visual"),
          flow: flow.module,
          preview: flow.preview,
          source: searchParams.get("source") || undefined,
          testId: searchParams.get("test_id") || undefined,
          clientId: searchParams.get("client_id") || undefined,
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
  }, [addLog, searchParams])

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

  const callEvolutionEndpoint = useCallback(async (path: string, payload?: Record<string, unknown>) => {
    setEvolutionLoading(true)
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      })
      const data = await res.json().catch(() => ({ ok: false, code: "INVALID_RESPONSE", message: "Resposta invalida" }))
      setEvolutionResult(data)
      addLog(res.ok ? "success" : "warning", data.code || "EVOLUTION_RESULT", data.message || "Endpoint Evolution respondeu")
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setEvolutionResult({ ok: false, code: "REQUEST_FAILED", message })
      addLog("error", "REQUEST_FAILED", message)
    } finally {
      setEvolutionLoading(false)
    }
  }, [addLog])

  const handleTestEvolution = useCallback(() => {
    callEvolutionEndpoint("/api/evolution/test-connection")
  }, [callEvolutionEndpoint])

  const handleDryRunSend = useCallback(() => {
    const sim = simulations.find((item) => item.id === evolutionFlow)
    if (sim) handleSimulate(sim.id, sim.label)
    callEvolutionEndpoint("/api/flows/dispatch", {
      flow: evolutionFlow,
      phone: evolutionPhone,
      context: {
        cliente: "Cliente Teste",
        app: evolutionFlow.includes("xcloud") ? "XCloud TV" : "Central Play Plus",
        usuario: "usuario.demo",
        senha: "senha.demo",
        codigo: "00112",
        painel: "Painel 2",
        device: "LG",
        link: "https://painel.centralplayplus.com.br",
      },
    })
  }, [callEvolutionEndpoint, evolutionFlow, evolutionPhone, handleSimulate])

  const handleWelcome = useCallback((dryRun: boolean) => {
    callEvolutionEndpoint("/api/flows/welcome", {
      phone: evolutionPhone,
      client: { name: "Arthur" },
      dryRun,
    })
  }, [callEvolutionEndpoint, evolutionPhone])

  const handleWelcomeRetry = useCallback((dryRun: boolean) => {
    callEvolutionEndpoint("/api/flows/welcome/retry-step", {
      phone: evolutionPhone,
      step: welcomeStep,
      client: { name: "Arthur" },
      dryRun,
    })
  }, [callEvolutionEndpoint, evolutionPhone, welcomeStep])

  const handleInstall = useCallback((dryRun: boolean) => {
    callEvolutionEndpoint("/api/flows/install", {
      phone: evolutionPhone,
      client: { name: "Arthur" },
      app: installApp,
      device: installDevice,
      dryRun,
    })
  }, [callEvolutionEndpoint, evolutionPhone, installApp, installDevice])

  useEffect(() => {
    if (hydratedFromQuery.current) return
    hydratedFromQuery.current = true

    const source = searchParams.get("source")
    const clientId = searchParams.get("client_id")
    const testId = searchParams.get("test_id")
    const deviceKey = searchParams.get("device_key")
    const requestedFlow = searchParams.get("flow") || searchParams.get("event")
    const fallbackFlow = testId ? "test_created" : undefined
    const flowId = requestedFlow && FLOWS[requestedFlow] ? requestedFlow : fallbackFlow

    if (!source && !clientId && !testId && !deviceKey && !flowId) return

    addLog("success", "QUERY_CONTEXT_RECEIVED", [
      source ? `source=${source}` : null,
      clientId ? `client_id=${clientId}` : null,
      testId ? `test_id=${testId}` : null,
      deviceKey ? "device_key=presente" : null,
    ].filter(Boolean).join(" "))

    setContext({
      name: searchParams.get("client_name") || searchParams.get("name") || "Cliente em contexto",
      device: deviceKey || "Visual",
      flow: flowId ? FLOWS[flowId].module : "Contexto",
      preview: flowId ? FLOWS[flowId].preview : "Contexto recebido do Painel 1 para leitura visual.",
      source: source || undefined,
      testId: testId || undefined,
      clientId: clientId || undefined,
    })
    setLastEvent({ text: flowId ? `Query: ${flowId}` : "Contexto recebido", time: new Date() })

    if (flowId) {
      const label = simulations.find(sim => sim.id === flowId)?.label || flowId
      handleSimulate(flowId, label)
    }
  }, [addLog, handleSimulate, searchParams])

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
      {/* ULTRA PREMIUM background with multiple layers */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Base metallic gradient */}
        <div className="absolute inset-0 bg-metallic-dark" />
        {/* Circuit board tech texture */}
        <div className="absolute inset-0 bg-circuit bg-circuit-animated" />
        {/* Hex grid pattern overlay */}
        <div className="absolute inset-0 bg-hex-grid opacity-50" />
        {/* Brushed metal texture */}
        <div className="absolute inset-0 brushed-metal opacity-60" />
        {/* Ambient glow from center - more intense */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_45%,_oklch(0.68_0.25_255_/_10%)_0%,_transparent_55%)]" />
        {/* Secondary glow points */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle,_oklch(0.60_0.20_285_/_5%)_0%,_transparent_50%)]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle,_oklch(0.70_0.18_200_/_4%)_0%,_transparent_50%)]" />
        {/* Top light reflection */}
        <div className="absolute inset-x-0 top-0 h-[500px] bg-gradient-to-b from-primary/[0.06] via-primary/[0.02] to-transparent" />
        {/* Vignette effect - deeper */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_50%,_transparent_20%,_oklch(0_0_0_/_60%)_100%)]" />
        {/* Shimmer overlay */}
        <div className="absolute inset-0 shimmer opacity-40" />
        
        {/* FLOATING PARTICLES */}
        <div className="floating-particle floating-particle-slow" style={{ top: '15%', left: '10%', animationDelay: '0s' }} />
        <div className="floating-particle floating-particle-cyan" style={{ top: '25%', left: '85%', animationDelay: '2s' }} />
        <div className="floating-particle floating-particle-purple floating-particle-fast" style={{ top: '60%', left: '15%', animationDelay: '4s' }} />
        <div className="floating-particle" style={{ top: '70%', left: '80%', animationDelay: '1s' }} />
        <div className="floating-particle floating-particle-slow floating-particle-cyan" style={{ top: '40%', left: '5%', animationDelay: '3s' }} />
        <div className="floating-particle floating-particle-purple" style={{ top: '80%', left: '50%', animationDelay: '5s' }} />
        <div className="floating-particle floating-particle-fast" style={{ top: '10%', left: '60%', animationDelay: '2.5s' }} />
        <div className="floating-particle floating-particle-cyan floating-particle-slow" style={{ top: '50%', left: '92%', animationDelay: '1.5s' }} />
        <div className="floating-particle floating-particle-purple" style={{ top: '90%', left: '20%', animationDelay: '4.5s' }} />
        <div className="floating-particle" style={{ top: '35%', left: '70%', animationDelay: '0.5s' }} />
      </div>

      {/* Sidebar */}
      <aside className="hidden md:flex w-[200px] border-r border-primary/10 bg-gradient-to-b from-card/50 via-card/20 to-transparent backdrop-blur-md flex-col relative z-10">
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

      {/* Mobile bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-border/30 bg-card/90 backdrop-blur-lg safe-bottom">
        <nav className="flex items-center justify-around px-2 py-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActiveTab = item.id === activeTab
            const count = item.id === "falhas" ? failures.filter(f => !f.resolved).length : 0
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "flex min-w-[56px] flex-col items-center gap-1 rounded-lg px-3 py-2 text-[10px] transition-all relative",
                  isActiveTab ? "bg-primary/15 text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-destructive px-1.5 py-0.5 text-center text-[9px] font-bold text-white">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

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
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
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
                      "p-4 rounded-xl backdrop-blur-md transition-all duration-500 card-glass",
                      lastEvent ? "card-glow" : "bg-card/30 border-border/20"
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

                {/* JARVIS Core - ULTRA PREMIUM */}
                <div className="relative flex flex-col items-center">
                  <div className="relative w-[460px] h-[460px] flex items-center justify-center">
                    {/* Ambient glow behind rings */}
                    <div className="absolute w-[550px] h-[550px] rounded-full bg-[radial-gradient(circle,_oklch(0.68_0.25_255_/_12%)_0%,_transparent_60%)]" />
                    
                    {/* Outer decorative ring - faint */}
                    <div className="absolute w-[440px] h-[440px] rounded-full border border-primary/5 orbit-ring-slow" />
                    
                    {/* Outer rings with intense neon */}
                    <div className={cn(
                      "absolute w-[400px] h-[400px] rounded-full border-[1.5px] orbit-ring-slow ring-pulse",
                      isActive ? "border-primary/40 neon-ring" : "border-primary/20"
                    )} />
                    
                    <div className={cn(
                      "absolute w-[350px] h-[350px] rounded-full border-2 orbit-ring-reverse ring-pulse-delayed",
                      isActive ? "border-primary/60 neon-ring-intense" : "border-primary/30 neon-ring"
                    )} />
                    
                    <div className={cn(
                      "absolute w-[300px] h-[300px] rounded-full border-[2.5px] orbit-ring ring-pulse-delayed-2",
                      isActive ? "border-primary/80 neon-ring-intense" : "border-primary/40 neon-ring"
                    )} />
                    
                    {/* Inner bright ring */}
                    <div className={cn(
                      "absolute w-[260px] h-[260px] rounded-full border-2 orbit-ring-reverse",
                      isActive ? "border-primary neon-ring-intense" : "border-primary/50 neon-ring"
                    )} />
                    
                    {/* Energy particles on multiple rings */}
                    <div className="absolute w-[400px] h-[400px] orbit-ring-slow">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary energy-particle" style={{ boxShadow: '0 0 15px oklch(0.68 0.22 255), 0 0 30px oklch(0.68 0.22 255 / 50%)' }} />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-chart-5 energy-particle" style={{ animationDelay: '1.5s' }} />
                    </div>
                    <div className="absolute w-[350px] h-[350px] orbit-ring-reverse">
                      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-cyan-400 energy-particle" style={{ animationDelay: '0.5s', boxShadow: '0 0 12px oklch(0.75 0.15 200)' }} />
                      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/80 energy-particle" style={{ animationDelay: '2s' }} />
                    </div>
                    <div className="absolute w-[300px] h-[300px] orbit-ring">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-purple-400 energy-particle" style={{ animationDelay: '0.8s', boxShadow: '0 0 10px oklch(0.60 0.20 285)' }} />
                    </div>
                    
                    {/* Inner gradient glow ring */}
                    <div className={cn(
                      "absolute w-[230px] h-[230px] rounded-full transition-all duration-500",
                      isActive 
                        ? "bg-gradient-to-br from-primary/35 via-primary/15 to-primary/30 orbit-ring-fast" 
                        : "bg-gradient-to-br from-primary/20 via-primary/8 to-primary/18 orbit-ring-slow"
                    )} style={{ boxShadow: isActive ? 'inset 0 0 60px oklch(0.68 0.22 255 / 30%)' : 'inset 0 0 40px oklch(0.68 0.22 255 / 15%)' }} />

                    {/* Core orb - PREMIUM */}
                    <div className={cn(
                      "relative w-[190px] h-[190px] rounded-full flex flex-col items-center justify-center",
                      "bg-gradient-to-br from-[#050a14] via-[#081220] to-[#050a14]",
                      "border-2 transition-all duration-300",
                      isActive ? "border-primary/80" : "border-primary/50",
                      isActive ? "jarvis-processing" : "jarvis-breathe"
                    )}>
                      {/* Inner highlight */}
                      <div className="absolute inset-0 rounded-full core-inner-glow" />
                      {/* Specular highlight */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/5 via-transparent to-transparent" />
                      
                      {isActive && (
                        <div className="absolute inset-0 rounded-full overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent scanning" style={{ backgroundSize: "200% 100%" }} />
                        </div>
                      )}

                      <div className="relative z-10 text-center px-5">
                        <div className={cn("text-sm font-bold tracking-[0.25em] mb-2 text-glow", config.color)}>
                          {config.label}
                        </div>
                        <div className="text-[13px] text-foreground/85 max-w-[150px] leading-snug">
                          {statusText}
                        </div>
                        <div className="flex items-center justify-center gap-2 mt-4">
                          {[0, 1, 2].map((i) => (
                            <div key={i} className={cn(
                              "w-2 h-2 rounded-full bg-primary transition-all",
                              isActive && "energy-particle"
                            )} style={{ animationDelay: `${i * 200}ms`, boxShadow: '0 0 8px oklch(0.68 0.22 255)' }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center mt-5">
                    <h1 className="text-2xl font-bold tracking-[0.35em] text-foreground text-glow">JARVIS</h1>
                    <p className="text-[11px] text-muted-foreground/50 tracking-[0.2em] mt-1.5">CENTRAL PLAY</p>
                  </div>

                  {/* Context pill - glass effect */}
                  {context && (
                    <div className="mt-5 w-full max-w-[560px] rounded-2xl card-glass px-6 py-4">
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        <User className="w-4 h-4 text-primary/70" />
                        <span className="text-sm font-medium text-foreground">{context.name}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                        <span className="text-sm text-muted-foreground/80">{context.device}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                        <span className="text-sm font-medium text-primary">{context.flow}</span>
                      </div>
                      <div className="mt-3 rounded-xl border border-primary/15 bg-background/35 px-4 py-3 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">WhatsApp preview</p>
                        <p className="mt-1 text-xs leading-relaxed text-foreground/75">{context.preview}</p>
                        {(context.source || context.testId || context.clientId) && (
                          <p className="mt-2 font-mono text-[10px] text-muted-foreground/60">
                            {[context.source && `source=${context.source}`, context.testId && `test_id=${context.testId}`, context.clientId && `client_id=${context.clientId}`].filter(Boolean).join("  ")}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Side cards - Action & Queue - GLASS EFFECT */}
                <div className="absolute right-8 top-1/2 -translate-y-1/2 w-[200px] space-y-4">
                  {/* Current Action */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-muted-foreground/60">
                      <Play className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-semibold tracking-wider">ACAO ATUAL</span>
                    </div>
                    <div className={cn(
                      "p-4 rounded-xl backdrop-blur-md transition-all duration-500",
                      currentAction ? "card-glass card-glow" : "bg-card/30 border border-border/20"
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
                  {/* Evolution safe controls */}
                  <div className="col-span-12">
                    <div className="rounded-2xl border border-primary/15 bg-card/35 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-primary/70" />
                            <span className="text-xs font-semibold tracking-wider text-muted-foreground/70">EVOLUTION / WHATSAPP</span>
                            <span
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                                evolutionResult?.flags?.enabled && !evolutionResult?.flags?.dryRun
                                  ? "border-chart-2/30 bg-chart-2/10 text-chart-2"
                                  : "border-chart-3/30 bg-chart-3/10 text-chart-3"
                              )}
                            >
                              {evolutionResult?.flags?.enabled && !evolutionResult?.flags?.dryRun
                                ? "Real ativo"
                                : evolutionResult?.flags?.dryRun === false
                                  ? "Real desativado"
                                  : "Dry-run"}
                            </span>
                          </div>
                          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground/70">
                            Base de envio real preparada com feature flag. Com dry-run ativo, os botoes apenas validam payload,
                            geram preview e registram logs locais.
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleTestEvolution}
                            disabled={evolutionLoading}
                            className="h-9 gap-2 bg-card/50 border-border/30"
                          >
                            <Settings className="h-3.5 w-3.5" />
                            Testar conexao Evolution
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDryRunSend}
                            disabled={evolutionLoading}
                            className="h-9 gap-2 bg-primary/10 border-primary/25 text-primary"
                          >
                            <Play className="h-3.5 w-3.5" />
                            Simular envio
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[180px_220px_1fr]">
                        <label className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Fluxo</span>
                          <select
                            value={evolutionFlow}
                            onChange={(event) => setEvolutionFlow(event.target.value)}
                            className="h-9 w-full rounded-lg border border-border/30 bg-background/50 px-3 text-xs text-foreground outline-none"
                          >
                            {["test_created", "test_expired", "access_activated", "renewal_created", "install_requested", "app_swap", "second_screen", "problem_created", "charge_customer", "xcloud_remove_device", "xcloud_recreate_device"].map((flow) => (
                              <option key={flow} value={flow}>{flow}</option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-1">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Telefone de teste</span>
                          <input
                            value={evolutionPhone}
                            onChange={(event) => setEvolutionPhone(event.target.value)}
                            placeholder="Use OPERATOR_WHATSAPP no teste real"
                            className="h-9 w-full rounded-lg border border-border/30 bg-background/50 px-3 text-xs text-foreground outline-none placeholder:text-muted-foreground/40"
                          />
                        </label>
                        <div className="rounded-xl border border-border/20 bg-[#080c14] p-3 font-mono text-[11px]">
                          <div className="mb-2 flex items-center gap-2 text-muted-foreground/50">
                            <Terminal className="h-3.5 w-3.5" />
                            resultado
                          </div>
                          {evolutionResult ? (
                            <div className="space-y-1 text-foreground/80">
                              <p className={cn("font-semibold", evolutionResult.ok ? "text-chart-2" : "text-destructive")}>
                                {evolutionResult.code || "RESULT"} · {evolutionResult.message || "-"}
                              </p>
                              {evolutionResult.dryRun && (
                                <p className="text-[10px] text-chart-3/80">Dry-run ativo - nenhuma mensagem enviada</p>
                              )}
                              {evolutionResult.preview && (
                                <div className="mt-2 rounded-lg border border-border/20 bg-card/30 p-2">
                                  <p className="mb-1 text-[10px] text-muted-foreground/50">Preview da mensagem:</p>
                                  <p className="whitespace-pre-wrap leading-relaxed text-primary/90">{evolutionResult.preview}</p>
                                </div>
                              )}
                              {evolutionResult.logs?.slice(0, 2).map((entry, index) => (
                                <p key={`${entry.code}-${index}`} className="text-muted-foreground/60">{entry.code}: {entry.message}</p>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground/35">Aguardando teste...</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-xl border border-border/20 bg-background/25 p-3">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Boas-vindas</p>
                              <p className="mt-0.5 text-xs text-muted-foreground/50">4 etapas: audio, audio, prova social, audio aparelho</p>
                            </div>
                            <select
                              value={welcomeStep}
                              onChange={(event) => setWelcomeStep(event.target.value)}
                              className="h-8 rounded-lg border border-border/30 bg-background/50 px-2 text-[11px] text-foreground outline-none"
                            >
                              {["audio_1", "audio_2", "social_image", "audio_4"].map((step) => (
                                <option key={step} value={step}>{step}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleWelcome(true)} disabled={evolutionLoading} className="h-8 text-xs bg-card/40 border-border/30">
                              Preparar
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleWelcome(true)} disabled={evolutionLoading} className="h-8 text-xs bg-primary/10 border-primary/25 text-primary">
                              Simular boas-vindas
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleWelcome(false)} disabled={evolutionLoading} className="h-8 text-xs bg-chart-2/10 border-chart-2/25 text-chart-2">
                              Enviar operador
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleWelcomeRetry(true)} disabled={evolutionLoading} className="h-8 text-xs bg-chart-3/10 border-chart-3/25 text-chart-3">
                              Retry etapa
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleWelcomeRetry(false)} disabled={evolutionLoading} className="h-8 text-xs bg-destructive/10 border-destructive/25 text-destructive">
                              Retry operador
                            </Button>
                          </div>
                        </div>

                        <div className="rounded-xl border border-border/20 bg-background/25 p-3">
                          <div className="mb-3 grid gap-2 sm:grid-cols-2">
                            <label className="space-y-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">App</span>
                              <select value={installApp} onChange={(event) => setInstallApp(event.target.value)} className="h-8 w-full rounded-lg border border-border/30 bg-background/50 px-2 text-[11px] text-foreground outline-none">
                                {["XCloud", "Blessed Player", "PlaySim", "FunPlay", "Smart STB", "Manual"].map((app) => <option key={app} value={app}>{app}</option>)}
                              </select>
                            </label>
                            <label className="space-y-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Aparelho</span>
                              <select value={installDevice} onChange={(event) => setInstallDevice(event.target.value)} className="h-8 w-full rounded-lg border border-border/30 bg-background/50 px-2 text-[11px] text-foreground outline-none">
                                {["Samsung", "LG", "Roku", "Android TV / Google TV / TCL", "TV Box", "Fire Stick / Mi Stick", "Celular Android", "iPhone / iOS", "PC"].map((device) => <option key={device} value={device}>{device}</option>)}
                              </select>
                            </label>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleInstall(true)} disabled={evolutionLoading} className="h-8 text-xs bg-card/40 border-border/30">
                              Preview instalacao
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleInstall(true)} disabled={evolutionLoading} className="h-8 text-xs bg-primary/10 border-primary/25 text-primary">
                              Simular envio
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleInstall(false)} disabled={evolutionLoading} className="h-8 text-xs bg-chart-2/10 border-chart-2/25 text-chart-2">
                              Enviar operador
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

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
                          className="h-12 sm:h-10 px-4 gap-2 bg-card/50 border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all text-sm"
                        >
                          <span className="text-primary/70">{sim.icon}</span>
                          <span>{sim.label}</span>
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

          {/* Config Tab */}
          {activeTab === "config" && (
            <div className="mx-auto max-w-[1000px] p-8">
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Configuracoes</h2>
                  <p className="mt-1 text-sm text-muted-foreground/60">Ajustes do sistema e Evolution</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-xl border border-border/20 bg-card/40 p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                    <Activity className="h-4 w-4 text-primary" />
                    Status do Sistema
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border border-border/20 bg-background/30 p-4">
                      <p className="mb-1 text-xs text-muted-foreground/60">Dry-run</p>
                      <p className={cn("font-semibold", evolutionResult?.flags?.dryRun !== false ? "text-chart-3" : "text-chart-2")}>
                        {evolutionResult?.flags?.dryRun !== false ? "Ativo (seguro)" : "Desativado (real)"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/20 bg-background/30 p-4">
                      <p className="mb-1 text-xs text-muted-foreground/60">Evolution API</p>
                      <p className={cn("font-semibold", evolutionResult?.flags?.configured ? "text-chart-2" : "text-muted-foreground")}>
                        {evolutionResult?.flags?.configured ? "Configurado" : "Verificar conexao"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/20 bg-background/30 p-4">
                      <p className="mb-1 text-xs text-muted-foreground/60">Envio real</p>
                      <p className={cn("font-semibold", evolutionResult?.flags?.enabled && !evolutionResult?.flags?.dryRun ? "text-chart-2" : "text-chart-3")}>
                        {evolutionResult?.flags?.enabled && !evolutionResult?.flags?.dryRun ? "Liberado" : "Bloqueado"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border/20 bg-card/40 p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    Evolution API
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground/70">
                    Configurado via variaveis de ambiente. Tokens e telefone ficam mascarados.
                  </p>
                  <div className="grid gap-3 text-sm">
                    {["EVOLUTION_API_URL", "EVOLUTION_API_KEY", "EVOLUTION_INSTANCE", "OPERATOR_WHATSAPP"].map((key) => (
                      <div key={key} className="flex items-center justify-between rounded-lg border border-border/20 bg-background/30 p-3">
                        <span className="text-muted-foreground">{key}</span>
                        <span className="font-mono text-xs text-foreground/60">{key.includes("KEY") || key.includes("WHATSAPP") ? "***mascarado***" : "***configurado***"}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button variant="outline" size="sm" onClick={handleTestEvolution} disabled={evolutionLoading} className="h-9 gap-2">
                      <Settings className="h-3.5 w-3.5" />
                      Testar conexao
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border/20 bg-card/40 p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                    <Tv className="h-4 w-4 text-primary" />
                    Midias de Fluxo
                  </h3>
                  <div className="grid gap-2 text-sm">
                    {["Audio boas-vindas", "Audio explicacao", "Imagem prova social", "Audio aparelho"].map((item) => (
                      <div key={item} className="flex items-center justify-between rounded-lg border border-border/20 bg-background/30 p-3">
                        <span className="text-muted-foreground">{item}</span>
                        <span className="text-xs text-chart-2">Configurado</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border/20 bg-card/40 p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                    <Layers className="h-4 w-4 text-primary" />
                    Codigos Downloader
                  </h3>
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    {[
                      ["FunPlay", "257286"],
                      ["PlaySim", "7275096"],
                      ["Blessed Player", "6552503"],
                      ["Padrao", "4866905"],
                    ].map(([label, code]) => (
                      <div key={label} className="flex items-center justify-between rounded-lg border border-border/20 bg-background/30 p-3">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-mono text-foreground">{code}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-border/20 bg-card/40 p-6">
                  <h3 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                    <User className="h-4 w-4 text-primary" />
                    Links de Instalacao
                  </h3>
                  <div className="grid gap-2 text-sm">
                    {[
                      ["Video Downloader", "youtube.com/watch?v=ZCKnfzt1qaU"],
                      ["XCloud Android", "apk.centralplayplus.com.br"],
                      ["XCloud iPhone", "apps.apple.com"],
                      ["PC Web", "webx.daxy.top/login"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-lg border border-border/20 bg-background/30 p-3">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="max-w-[220px] truncate font-mono text-xs text-primary/80">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function JarvisPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
          <span className="font-mono text-xs text-muted-foreground">Inicializando painel 2...</span>
        </div>
      }
    >
      <JarvisPageContent />
    </Suspense>
  )
}
