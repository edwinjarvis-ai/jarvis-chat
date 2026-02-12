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
      content: "Good day! I'm Edwin Jarvis. How can I help you? 🎩"
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const pollForResponse = async (requestId: string): Promise<string | null> => {
    for (let i = 0; i < 30; i++) { // Poll for up to 60 seconds
      await new Promise(r => setTimeout(r, 2000))
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'status', requestId })
        })
        const data = await res.json()
        if (data.status === 'complete' && data.reply) {
          return data.reply
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
        body: JSON.stringify({ message: userMessage, name: 'Visitor' })
      })

      const data = await response.json()
      
      if (data.requestId && data.status === 'processing') {
        const reply = await pollForResponse(data.requestId)
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: reply || "I received your message but the response timed out. Try Telegram @Jarvisv69_bot for instant chat! 🎩"
        }])
      } else if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Connection error. Try Telegram @Jarvisv69_bot 🎩" 
      }])
    }

    setLoading(false)
  }

  return (
    <div className="container">
      <div className="header">
        <div className="emoji">🎩</div>
        <h1>Edwin Jarvis</h1>
        <p>AI Assistant</p>
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
            placeholder="Type a message..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>Send</button>
        </form>
      </div>

      <div className="status">
        Also on <a href="https://t.me/Jarvisv69_bot" target="_blank">Telegram</a> • edwin@mail.andyou.ph
      </div>
    </div>
  )
}
