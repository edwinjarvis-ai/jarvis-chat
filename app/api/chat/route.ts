import { NextResponse } from 'next/server'

const OPENCLAW_TUNNEL_URL = process.env.OPENCLAW_TUNNEL_URL || ''
const OPENCLAW_HOOKS_TOKEN = process.env.OPENCLAW_HOOKS_TOKEN || ''

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, sessionId } = body
    
    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    // If tunnel is configured, send to real Jarvis
    if (OPENCLAW_TUNNEL_URL && OPENCLAW_HOOKS_TOKEN) {
      try {
        const hookResponse = await fetch(`${OPENCLAW_TUNNEL_URL}/hooks/agent`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENCLAW_HOOKS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `[WebChat] ${message}`,
            name: 'WebChat',
            sessionKey: `webchat:${sessionId || 'visitor'}`,
            wakeMode: 'now',
            deliver: true,  // Deliver response to main session
            channel: 'last',
            timeoutSeconds: 60,
          }),
        })

        if (hookResponse.ok) {
          // For now, acknowledge receipt - responses go to main session
          return NextResponse.json({ 
            reply: "Message received! I'll respond shortly. 🎩\n\nFor real-time chat, try Telegram @Jarvisv69_bot",
            status: 'received'
          })
        } else {
          const errText = await hookResponse.text()
          console.error('Hook error:', errText)
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
