import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const OPENCLAW_TUNNEL_URL = process.env.OPENCLAW_TUNNEL_URL || ''
const OPENCLAW_HOOKS_TOKEN = process.env.OPENCLAW_HOOKS_TOKEN || ''

// Initialize Redis from environment variables (auto-configured by Vercel)
const redis = Redis.fromEnv()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Handle callback from agent
    if (body.type === 'callback' && body.requestId && body.response) {
      await redis.set(`chat:${body.requestId}`, body.response, { ex: 300 }) // 5 min TTL
      return NextResponse.json({ ok: true })
    }
    
    // Handle status check (polling)
    if (body.type === 'status' && body.requestId) {
      const response = await redis.get<string>(`chat:${body.requestId}`)
      if (response) {
        await redis.del(`chat:${body.requestId}`)
        return NextResponse.json({ reply: response, status: 'complete' })
      }
      return NextResponse.json({ status: 'pending' })
    }
    
    // Handle new message
    const { message, sessionId } = body
    
    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const callbackUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}/api/chat`
      : 'https://jarvis-chat-six.vercel.app/api/chat'

    // If tunnel is configured, send to real Jarvis
    if (OPENCLAW_TUNNEL_URL && OPENCLAW_HOOKS_TOKEN) {
      try {
        // Mark request as pending in Redis
        await redis.set(`chat:${requestId}`, 'pending', { ex: 300 })

        // Enhanced message with callback instructions
        const enhancedMessage = `[WebChat ID:${requestId}] User says: "${message}"

IMPORTANT: After you compose your reply, you MUST deliver it by running this curl command:

curl -X POST "${callbackUrl}" -H "Content-Type: application/json" -d '{"type":"callback","requestId":"${requestId}","response":"YOUR_REPLY_HERE"}'

Replace YOUR_REPLY_HERE with your actual response (escape quotes properly). Do this BEFORE ending your turn.`

        const hookResponse = await fetch(`${OPENCLAW_TUNNEL_URL}/hooks/agent`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENCLAW_HOOKS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: enhancedMessage,
            name: 'WebChat',
            sessionKey: `webchat:${sessionId || 'visitor'}`,
            wakeMode: 'now',
            deliver: false,
            timeoutSeconds: 60,
          }),
        })

        if (hookResponse.ok) {
          return NextResponse.json({ 
            requestId,
            status: 'processing',
            message: 'Processing your message...'
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
