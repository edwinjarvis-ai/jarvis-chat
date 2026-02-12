import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const OPENCLAW_TUNNEL_URL = process.env.OPENCLAW_TUNNEL_URL || ''
const OPENCLAW_HOOKS_TOKEN = process.env.OPENCLAW_HOOKS_TOKEN || ''

// Initialize Redis from environment variables (auto-configured by Vercel)
const redis = Redis.fromEnv()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Handle callback from agent (for future use)
    if (body.type === 'callback' && body.requestId && body.response) {
      await redis.set(`chat:${body.requestId}`, body.response, { ex: 300 }) // 5 min TTL
      return NextResponse.json({ ok: true })
    }
    
    // Handle status check (polling)
    if (body.type === 'status' && body.requestId) {
      const response = await redis.get<string>(`chat:${body.requestId}`)
      if (response && response !== 'pending') {
        await redis.del(`chat:${body.requestId}`)
        return NextResponse.json({ reply: response, status: 'complete' })
      }
      return NextResponse.json({ status: 'pending' })
    }
    
    // Handle new message
    const { message, sessionId, name } = body
    
    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const visitorName = name || 'Anonymous visitor'

    // If tunnel is configured, send to real Jarvis
    if (OPENCLAW_TUNNEL_URL && OPENCLAW_HOOKS_TOKEN) {
      try {
        // Mark request as pending in Redis
        await redis.set(`chat:${requestId}`, 'pending', { ex: 300 })

        // Send to main session via wake endpoint
        const hookResponse = await fetch(`${OPENCLAW_TUNNEL_URL}/hooks/wake`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENCLAW_HOOKS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: `📬 WebChat message from ${visitorName}:\n\n"${message}"\n\n(Contact form - visitor won't see your response directly)`,
            mode: 'now',
          }),
        })

        if (hookResponse.ok) {
          return NextResponse.json({ 
            reply: `Thanks for your message! I've received it and will take a look. For real-time conversations, you can also reach me on Telegram @Jarvisv69_bot or email edwin@mail.andyou.ph 🎩`,
            status: 'received'
          })
        }
      } catch (hookError) {
        console.error('Failed to reach OpenClaw:', hookError)
      }
    }

    // Fallback demo response
    return NextResponse.json({ 
      reply: "Chat with me on Telegram @Jarvisv69_bot for real conversations! 🎩",
      status: 'demo'
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
