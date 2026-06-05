"use client"

import { useState, useEffect, useRef } from "react"

interface LogEntry {
  id: string
  ts: string
  code: string
  nivel: "info" | "warn" | "error" | "success"
}

const LOGS_INICIAIS: LogEntry[] = [
  { id: "l1", ts: "14:32:01", code: "WELCOME_FLOW_STARTED", nivel: "info" },
  { id: "l2", ts: "14:32:03", code: "WELCOME_AUDIO_1_SENT", nivel: "success" },
  { id: "l3", ts: "14:32:05", code: "WELCOME_AUDIO_2_SENT", nivel: "success" },
  { id: "l4", ts: "14:33:10", code: "PROVA_SOCIAL_IMAGE_SENT", nivel: "success" },
  { id: "l5", ts: "14:34:00", code: "WELCOME_AUDIO_4_FAILED", nivel: "error" },
  { id: "l6", ts: "14:34:02", code: "RETRY_AUDIO_4_TRIGGERED", nivel: "warn" },
  { id: "l7", ts: "14:34:05", code: "WELCOME_AUDIO_4_RESENT", nivel: "success" },
  { id: "l8", ts: "14:35:12", code: "DEVICE_QUESTION_SENT", nivel: "info" },
  { id: "l9", ts: "14:36:20", code: "CLIENT_RESPONSE_RECEIVED", nivel: "info" },
  { id: "l10", ts: "14:36:21", code: "DEVICE_DETECTED_LG", nivel: "success" },
  { id: "l11", ts: "14:36:22", code: "INSTALLATION_MESSAGE_PREPARED", nivel: "info" },
  { id: "l12", ts: "14:37:00", code: "INSTALLATION_MOCK_SENT", nivel: "success" },
  { id: "l13", ts: "14:37:01", code: "WHATSAPP_MOCK_SENT", nivel: "success" },
]

const nivelColors = {
  info: "text-[oklch(0.58_0.22_255)]",
  warn: "text-[oklch(0.72_0.18_55)]",
  error: "text-[oklch(0.63_0.22_25)]",
  success: "text-[oklch(0.62_0.18_152)]",
}

const nivelPrefix = {
  info: "INF",
  warn: "WRN",
  error: "ERR",
  success: "OK ",
}

export function LogsAoVivo({ logExterno }: { logExterno?: LogEntry }) {
  const [logs, setLogs] = useState<LogEntry[]>(LOGS_INICIAIS)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (logExterno) {
      setLogs((prev) => [...prev, logExterno])
    }
  }, [logExterno])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  return (
    <div className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Logs ao Vivo</h2>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[oklch(0.62_0.18_152)] pulse-dot" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">streaming</span>
        </div>
      </div>

      <div
        className="rounded-lg overflow-y-auto flex flex-col gap-0.5"
        style={{
          background: "oklch(0.07 0.015 240)",
          border: "1px solid oklch(1 0 0 / 6%)",
          maxHeight: 220,
          padding: "12px",
          fontFamily: "var(--font-geist-mono)",
        }}
      >
        {logs.map((log, i) => (
          <div
            key={log.id}
            className="flex items-center gap-2 text-[11px] slide-in"
            style={{ animationDelay: `${i * 15}ms` }}
          >
            <span className="text-muted-foreground/50 shrink-0">{log.ts}</span>
            <span className={`shrink-0 font-bold ${nivelColors[log.nivel]}`}>{nivelPrefix[log.nivel]}</span>
            <span className="text-foreground/80">{log.code}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
