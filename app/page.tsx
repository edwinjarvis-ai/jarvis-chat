'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

// Gateway URL and token from environment
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || ''
const GATEWAY_TOKEN = process.env.NEXT_PUBLIC_GATEWAY_TOKEN || ''

let requestId = 0
const nextId = () => `req-${++requestId}`

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState('Connecting...')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const pendingRef = useRef<Map<string, (payload: any) => void>>(new Map())
  const streamRef = useRef<string>('')
  const connectNonceRef = useRef<string | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const request = useCallback((method: string, params: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        reject(new Error('Not connected'))
        return
      }
      const id = nextId()
      pendingRef.current.set(id, resolve)
      wsRef.current.send(JSON.stringify({ type: 'req', id, method, params }))
      setTimeout(() => {
        if (pendingRef.current.has(id)) {
          pendingRef.current.delete(id)
          reject(new Error('Request timeout'))
        }
      }, 120000)
    })
  }, [])

  const sendConnect = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    
    const instanceId = `wc-${Math.random().toString(36).slice(2)}-${Date.now()}`
    const connectParams: any = {
      minProtocol: 3,
      maxProtocol: 3,
      client: {
        id: 'webchat',  // Use recognized client ID
        version: '1.0.0',
        platform: 'web',
        mode: 'webchat',
        instanceId
      },
      auth: GATEWAY_TOKEN ? { token: GATEWAY_TOKEN } : undefined
    }
    
    // Only include nonce if we received one from challenge
    if (connectNonceRef.current) {
      connectParams.nonce = connectNonceRef.current
    }
    
    const id = nextId()
    pendingRef.current.set(id, (payload) => {
      setConnected(true)
      setStatus('Connected')
      const name = payload?.assistant?.name || 'Jarvis'
      setMessages([{ role: 'assistant', content: `Good evening! I'm ${name}, at your service. 🎩` }])
    })
    
    wsRef.current.send(JSON.stringify({
      type: 'req',
      id,
      method: 'connect',
      params: connectParams
    }))
  }, [])

  const connect = useCallback(() => {
    if (!GATEWAY_URL) {
      setStatus('Gateway URL not configured')
      return
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) return
    
    setStatus('Connecting...')
    connectNonceRef.current = null
    const ws = new WebSocket(GATEWAY_URL)
    
    ws.onopen = () => {
      console.log('WebSocket open, waiting for challenge...')
      setStatus('Authenticating...')
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        // Handle connect challenge - save nonce and send connect
        if (data.type === 'event' && data.event === 'connect.challenge') {
          connectNonceRef.current = data.payload?.nonce || null
          sendConnect()
          return
        }
        
        // Handle response
        if (data.type === 'res') {
          const resolver = pendingRef.current.get(data.id)
          if (resolver) {
            pendingRef.current.delete(data.id)
            if (data.ok) {
              resolver(data.payload)
            } else {
              console.error('Request failed:', data.error)
              setStatus(`Error: ${data.error?.message || 'Unknown error'}`)
            }
          }
          return
        }
        
        // Handle chat events (streaming responses)
        if (data.type === 'event' && data.event === 'chat') {
          const payload = data.payload
          if (!payload) return
          
          if (payload.state === 'delta') {
            // Extract text from message
            const msg = payload.message
            let text = ''
            if (typeof msg?.content === 'string') {
              text = msg.content
            } else if (Array.isArray(msg?.content)) {
              text = msg.content
                .filter((c: any) => c.type === 'text')
                .map((c: any) => c.text)
                .join('')
            }
            if (text) {
              streamRef.current = text
              // Update streaming message
              setMessages(prev => {
                const last = prev[prev.length - 1]
                if (last?.role === 'assistant' && loading) {
                  return [...prev.slice(0, -1), { role: 'assistant', content: text }]
                }
                return prev
              })
            }
          } else if (payload.state === 'final' || payload.state === 'error' || payload.state === 'aborted') {
            setLoading(false)
            streamRef.current = ''
          }
        }
      } catch (e) {
        console.error('Parse error:', e)
      }
    }
    
    ws.onclose = (event) => {
      setConnected(false)
      const reason = event.reason || 'Connection closed'
      setStatus(`Disconnected: ${reason}`)
      console.log('Disconnected from Gateway:', event.code, reason)
      setTimeout(connect, 3000)
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setStatus('Connection error')
    }
    
    wsRef.current = ws
  }, [loading, sendConnect])

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
    setLoading(true)
    streamRef.current = ''
    
    // Add placeholder for streaming response
    setMessages(prev => [...prev, { role: 'assistant', content: '...' }])

    try {
      await request('chat.send', {
        sessionKey: 'main',
        message: userMessage,
        deliver: false,
        idempotencyKey: `wc-${Date.now()}-${Math.random().toString(36).slice(2)}`
      })
    } catch (err) {
      console.error('Send error:', err)
      setMessages(prev => {
        const last = prev[prev.length - 1]
        if (last?.role === 'assistant' && last.content === '...') {
          return [...prev.slice(0, -1), { role: 'assistant', content: 'Error: Could not send message' }]
        }
        return prev
      })
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div className="emoji">🎩</div>
        <h1>Edwin Jarvis</h1>
        <p style={{ color: connected ? '#4ade80' : '#f87171' }}>
          {connected ? '● Connected' : `○ ${status}`}
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
          {loading && messages[messages.length - 1]?.content === '...' && (
            <div className="message assistant" style={{ opacity: 0 }}>
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
            placeholder={connected ? "Type a message..." : status}
            disabled={loading || !connected}
          />
          <button type="submit" disabled={loading || !input.trim() || !connected}>Send</button>
        </form>
      </div>

      <div className="status">
        Direct Gateway connection via WebSocket 🔌
      </div>
    </div>
  )
}
