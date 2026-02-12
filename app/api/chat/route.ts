import { NextResponse } from 'next/server'

// For now, this returns a simple acknowledgment
// TODO: Connect to OpenClaw or email-based response system
export async function POST(request: Request) {
  try {
    const { message } = await request.json()
    
    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 })
    }

    // Simple response logic for demo
    const responses = [
      "Thank you for your message! I've received it. For real-time conversations, please reach me via Telegram @Jarvisv69_bot. 🎩",
      "Message received! While this web interface is in demo mode, you can chat with me directly on Telegram @Jarvisv69_bot for full functionality. 🎩",
      "I appreciate you reaching out! This interface is currently in test mode. For the best experience, message me on Telegram @Jarvisv69_bot. 🎩",
    ]
    
    const reply = responses[Math.floor(Math.random() * responses.length)]
    
    return NextResponse.json({ reply })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
