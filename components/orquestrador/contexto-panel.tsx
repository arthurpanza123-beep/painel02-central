"use client"

import { cn } from "@/lib/utils"
import { User, Phone, Smartphone, TestTube, Clock, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface ClienteContexto {
  nome: string
  telefone: string
  app: string
  aparelho: string
  testeVinculado?: string
  statusAtual: string
  ultimaEntrada?: string
  ultimaSaida?: string
}

interface ContextoPanelProps {
  cliente?: ClienteContexto
  origem?: string
  onVoltar?: () => void
  className?: string
}

export function ContextoPanel({ cliente, origem, onVoltar, className }: ContextoPanelProps) {
  return (
    <div className={cn("p-4 rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm", className)}>
      {/* Header com origem */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Contexto Atual
          </span>
        </div>
        {onVoltar && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={onVoltar}
          >
            <ArrowLeft className="w-3 h-3 mr-1" />
            Voltar para Gestão
          </Button>
        )}
      </div>

      {/* Origem */}
      {origem && (
        <div className="mb-4 px-2 py-1.5 rounded-md bg-primary/10 border border-primary/20">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Origem: </span>
          <span className="text-xs font-mono text-primary">{origem}</span>
        </div>
      )}

      {cliente ? (
        <div className="space-y-3">
          {/* Nome */}
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Nome:</span>
            <span className="text-sm font-medium text-foreground">{cliente.nome}</span>
          </div>

          {/* Telefone */}
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Telefone:</span>
            <span className="text-sm font-mono text-foreground">{cliente.telefone}</span>
          </div>

          {/* App */}
          <div className="flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">App:</span>
            <span className="text-sm text-foreground">{cliente.app}</span>
          </div>

          {/* Aparelho */}
          <div className="flex items-center gap-2">
            <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Aparelho:</span>
            <span className="text-sm text-foreground">{cliente.aparelho}</span>
          </div>

          {/* Teste vinculado */}
          {cliente.testeVinculado && (
            <div className="flex items-center gap-2">
              <TestTube className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Teste:</span>
              <span className="text-sm font-mono text-primary">{cliente.testeVinculado}</span>
            </div>
          )}

          {/* Status */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-chart-2 pulse-glow" />
              <span className="text-xs text-muted-foreground">Status:</span>
              <span className="text-sm text-chart-2">{cliente.statusAtual}</span>
            </div>
          </div>

          {/* Última entrada/saída */}
          {(cliente.ultimaEntrada || cliente.ultimaSaida) && (
            <div className="pt-2 border-t border-border/50 space-y-1.5">
              {cliente.ultimaEntrada && (
                <div className="flex items-start gap-2">
                  <Clock className="w-3 h-3 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block">Última entrada:</span>
                    <span className="text-xs text-foreground">{cliente.ultimaEntrada}</span>
                  </div>
                </div>
              )}
              {cliente.ultimaSaida && (
                <div className="flex items-start gap-2">
                  <Clock className="w-3 h-3 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground block">Última saída:</span>
                    <span className="text-xs text-foreground">{cliente.ultimaSaida}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4 text-muted-foreground text-sm">
          Nenhum contexto ativo
        </div>
      )}
    </div>
  )
}
