'use client'

import { useEffect, useRef, useState } from 'react'
import { Terminal, X, Minus } from 'lucide-react'
import '@xterm/xterm/css/xterm.css'

interface EmbeddedTerminalProps {
  onClose?: () => void
  defaultHeight?: number
}

export default function EmbeddedTerminal({ onClose, defaultHeight = 400 }: EmbeddedTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<import('@xterm/xterm').Terminal | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fitRef = useRef<import('@xterm/addon-fit').FitAddon | null>(null)
  const [connected, setConnected] = useState(false)
  const [collapsed, setCollapsed] = useState(true)  // Default to collapsed
  const [height, setHeight] = useState(defaultHeight)
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null)

  useEffect(() => {
    let ws: WebSocket
    let terminal: import('@xterm/xterm').Terminal
    let fitAddon: import('@xterm/addon-fit').FitAddon

    async function init() {
      const { Terminal: Term } = await import('@xterm/xterm')
      const { FitAddon } = await import('@xterm/addon-fit')

      terminal = new Term({
        theme: {
          background: '#09090b',
          foreground: '#fafafa',
        },
        fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", monospace',
        fontSize: 12,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: 'bar',
        scrollback: 5000,
      })

      fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)

      terminalRef.current = terminal
      fitRef.current = fitAddon

      if (containerRef.current && !collapsed) {
        terminal.open(containerRef.current)
        setTimeout(() => fitAddon.fit(), 50)
      }

      const wsHost = process.env.NEXT_PUBLIC_TERMINAL_WS_URL
        ?? `ws://${window.location.hostname}:3001`
      ws = new WebSocket(wsHost)
      wsRef.current = ws

      ws.binaryType = 'arraybuffer'

      ws.onopen = () => {
        setConnected(true)
        terminal.write('\x1b[2J\x1b[H')
        terminal.writeln('\x1b[1;32mClaude Code Best\x1b[0m\r')
      }

      ws.onmessage = (event) => {
        const data = typeof event.data === 'string'
          ? event.data
          : new TextDecoder().decode(event.data as ArrayBuffer)
        terminal.write(data)
      }

      ws.onclose = () => {
        setConnected(false)
        terminal.write('\r\n\x1b[31m[ disconnected ]\x1b[0m\r\n')
      }

      ws.onerror = () => {
        setConnected(false)
      }

      terminal.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data)
        }
      })

      terminal.onResize(({ cols, rows }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(`\x1b[8;${rows};${cols}t`)
        }
      })
    }

    if (!collapsed) {
      init()
    }

    return () => {
      terminal?.dispose()
      ws?.close()
    }
  }, [collapsed])

  // Handle resize
  function onResizeStart(e: React.MouseEvent) {
    e.preventDefault()
    resizeRef.current = { startY: e.clientY, startHeight: height }
    document.addEventListener('mousemove', onResizeMove)
    document.addEventListener('mouseup', onResizeEnd)
  }

  function onResizeMove(e: MouseEvent) {
    if (!resizeRef.current) return
    const delta = resizeRef.current.startY - e.clientY
    setHeight(Math.max(150, Math.min(800, resizeRef.current.startHeight + delta)))
  }

  function onResizeEnd() {
    resizeRef.current = null
    document.removeEventListener('mousemove', onResizeMove)
    document.removeEventListener('mouseup', onResizeEnd)
    setTimeout(() => fitRef.current?.fit(), 50)
  }

  // Fit terminal when height changes
  useEffect(() => {
    if (fitRef.current && containerRef.current) {
      setTimeout(() => fitRef.current?.fit(), 50)
    }
  }, [height, collapsed])

  return (
    <div
      className="flex flex-col bg-zinc-950 border-r border-zinc-800/50 shrink-0 overflow-hidden"
      style={{ width: 340, height: collapsed ? 40 : height }}
    >
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900 border-b border-zinc-800/50 shrink-0 select-none">
        <Terminal size={13} className="text-zinc-400" />
        <span className="text-xs font-medium text-zinc-300 flex-1">Terminal</span>
        <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
          title={collapsed ? '展开' : '收起'}
        >
          <Minus size={11} />
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
            title="关闭"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Resize handle */}
      {!collapsed && (
        <div
          className="h-1 bg-zinc-800/50 hover:bg-zinc-700/50 cursor-ns-resize transition-colors shrink-0"
          onMouseDown={onResizeStart}
        />
      )}

      {/* Terminal */}
      {!collapsed && (
        <div
          ref={containerRef}
          className="flex-1 min-h-0 p-1 overflow-hidden"
          style={{ background: '#09090b' }}
        />
      )}

      <style>{`
        .xterm { padding: 4px; }
        .xterm-viewport::-webkit-scrollbar { width: 4px; }
        .xterm-viewport::-webkit-scrollbar-track { background: transparent; }
        .xterm-viewport::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 2px; }
      `}</style>
    </div>
  )
}
