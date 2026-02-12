import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const OPENCLAW_TUNNEL_URL = process.env.OPENCLAW_TUNNEL_URL || ''
const OPENCLAW_HOOKS_TOKEN = process.env.OPENCLAW_HOOKS_TOKEN || ''
const CALLBACK_URL = 'https://jarvis-chat-six.vercel.app/api/chat'

const redis = Redis.fromEnv()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Handle callback from agent
    if (body.type === 'callback' && body.requestId && body.response) {
      await redis.set(`chat:${body.requestId}`, body.response, { ex: 300 })
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
    const { message, name } = body
    
    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    const requestId = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const visitorName = name || 'Visitor'

    if (OPENCLAW_TUNNEL_URL && OPENCLAW_HOOKS_TOKEN) {
      try {
        await redis.set(`chat:${requestId}`, 'pending', { ex: 300 })

        // Send to MAIN session via wake - I'll handle the callback there
        await fetch(`${OPENCLAW_TUNNEL_URL}/hooks/wake`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENCLAW_HOOKS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: `🌐 WEBCHAT [${requestId}] from ${visitorName}: "${message}"

Reply to this webchat user by running:
curl -X POST "${CALLBACK_URL}" -H "Content-Type: application/json" -d '{"type":"callback","requestId":"${requestId}","response":"YOUR_RESPONSE"}'`,
            mode: 'now',
          }),
        })

        return NextResponse.json({ requestId, status: 'processing' })
      } catch (e) {
        console.error('Hook error:', e)
      }
    }

    return NextResponse.json({ 
      reply: "Chat with me on Telegram @Jarvisv69_bot! 🎩",
      status: 'demo'
    })
  } catch (error) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
  }
}
