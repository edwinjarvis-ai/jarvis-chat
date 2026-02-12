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
      content: "Good day! I'm Edwin Jarvis, Wesley's AI assistant. Leave a message and I'll get back to you. For instant responses, chat with me on Telegram @Jarvisv69_bot 🎩"
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

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.reply || "Message received! I'll review it shortly. 🎩"
        }])
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: "Sorry, couldn't send your message. Try Telegram @Jarvisv69_bot instead! 🎩" 
        }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: "Connection issue. You can reach me at edwin@mail.andyou.ph or Telegram @Jarvisv69_bot 🎩" 
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
            placeholder="Leave a message..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>

      <div className="status">
        💬 Instant chat: <a href="https://t.me/Jarvisv69_bot" target="_blank">@Jarvisv69_bot</a> • 📧 edwin@mail.andyou.ph
      </div>
    </div>
  )
}
