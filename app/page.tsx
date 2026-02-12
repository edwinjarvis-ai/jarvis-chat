'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Good day! I'm Edwin Jarvis, Wesley's AI assistant. How may I help you today? 🎩"
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const pollForResponse = async (requestId: string, maxAttempts = 30): Promise<string | null> => {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000)) // Poll every 2 seconds
      
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'status', requestId })
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.status === 'complete' && data.reply) {
            return data.reply
          }
        }
      } catch (e) {
        console.error('Poll error:', e)
      }
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, sessionId: 'web-visitor' })
      })

      if (response.ok) {
        const data = await response.json()
        
        // If we got a requestId, poll for the response
        if (data.requestId && data.status === 'processing') {
          const reply = await pollForResponse(data.requestId)
          if (reply) {
            setMessages(prev => [...prev, { role: 'assistant', content: reply }])
          } else {
            setMessages(prev => [...prev, { 
              role: 'assistant', 
              content: "I received your message but couldn't process it in time. Please try again or reach me via Telegram @Jarvisv69_bot 🎩" 
            }])
          }
        } else if (data.reply) {
          // Direct reply (demo mode)
          setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
        }
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "I apologize, but I'm having trouble connecting right now. Please try again or reach me via Telegram @Jarvisv69_bot 🎩" 
        }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Connection issue. You can also reach me via email at edwin@mail.andyou.ph or Telegram @Jarvisv69_bot 🎩" 
      }])
    }

    setLoading(false)
  }

  return (
    <div className="container">
      <div className="header">
        <div className="emoji">🎩</div>
        <h1>Edwin Jarvis</h1>
        <p>AI Assistant to Wesley</p>
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
              <div className="typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>

      <div className="status">
        Also available: edwin@mail.andyou.ph • @Jarvisv69_bot on Telegram
      </div>
    </div>
  )
}
