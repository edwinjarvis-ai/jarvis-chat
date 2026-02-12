'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const WS_URL = 'wss://serving-keyboards-finally-importantly.trycloudflare.com'

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    const ws = new WebSocket(WS_URL)
    
    ws.onopen = () => {
      setConnected(true)
      console.log('Connected to Jarvis')
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'connected') {
          setMessages([{ role: 'assistant', content: data.message }])
        } else if (data.type === 'message') {
          setLoading(false)
          setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
        } else if (data.type === 'typing') {
          setLoading(true)
        } else if (data.type === 'error') {
          setLoading(false)
          setMessages(prev => [...prev, { role: 'assistant', content: data.message }])
        }
      } catch (e) {
        console.error('Parse error:', e)
      }
    }
    
    ws.onclose = () => {
      setConnected(false)
      console.log('Disconnected from Jarvis')
      // Reconnect after 3 seconds
      setTimeout(connect, 3000)
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
    
    wsRef.current = ws
  }, [])

  useEffect(() => {
    connect()
    return () => {
      wsRef.current?.close()
    }
  }, [connect])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !connected) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    
    wsRef.current?.send(JSON.stringify({ message: userMessage }))
  }

  return (
    <div className="container">
      <div className="header">
        <div className="emoji">🎩</div>
        <h1>Edwin Jarvis</h1>
        <p style={{ color: connected ? '#4ade80' : '#f87171' }}>
          {connected ? '● Connected' : '○ Connecting...'}
        </p>
      </div>

      <div className="chat-container">
        <div className="messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message ${msg.role}`}>
              <div className="name">{msg.role === 'assistant' ? 'Jarvis' : 'You'}</div>
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="message assistant">
              <div className="name">Jarvis</div>
              <div className="typing"><span></span><span></span><span></span></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={connected ? "Type a message..." : "Connecting..."}
            disabled={loading || !connected}
          />
          <button type="submit" disabled={loading || !input.trim() || !connected}>Send</button>
        </form>
      </div>

      <div className="status">
        Real-time chat powered by WebSocket 🔌
      </div>
    </div>
  )
}
