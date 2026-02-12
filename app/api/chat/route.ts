import { NextResponse } from 'next/server'

const OPENCLAW_TUNNEL_URL = process.env.OPENCLAW_TUNNEL_URL || ''
const OPENCLAW_HOOKS_TOKEN = process.env.OPENCLAW_HOOKS_TOKEN || ''

export async function POST(request: Request) {
  try {
    const { message, sessionId } = await request.json()
    
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
            message: `[WebChat${sessionId ? ` session:${sessionId}` : ''}] ${message}`,
            name: 'WebChat',
            sessionKey: `webchat:${sessionId || 'anonymous'}`,
            wakeMode: 'now',
            deliver: false,  // Don't auto-deliver; we'll handle response
            timeoutSeconds: 120,
          }),
        })

        if (hookResponse.ok) {
          return NextResponse.json({ 
            reply: "Message received! I'm processing your request... 🎩\n\n_Note: This webchat is in beta. For the best experience, chat with me on Telegram @Jarvisv69_bot._",
            status: 'processing'
          })
        } else {
          console.error('Hook error:', await hookResponse.text())
        }
      } catch (hookError) {
        console.error('Failed to reach OpenClaw:', hookError)
      }
    }

    // Fallback demo response if tunnel not configured or failed
    const responses = [
      "Thank you for your message! I've received it. For real-time conversations, please reach me via Telegram @Jarvisv69_bot. 🎩",
      "Message received! While this web interface is in demo mode, you can chat with me directly on Telegram @Jarvisv69_bot for full functionality. 🎩",
    ]
    
    return NextResponse.json({ 
      reply: responses[Math.floor(Math.random() * responses.length)],
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
