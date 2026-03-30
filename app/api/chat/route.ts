export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { streamChat } from '@/lib/anthropic'
import { sql } from '@/lib/db'
import { z } from 'zod'

const ChatRequestSchema = z.object({
  sessionId: z.string(),
  tenderId: z.string().optional(),
  context: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ),
})

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json()
    const { sessionId, tenderId, context, messages } = ChatRequestSchema.parse(body)

    if (!messages.length) {
      return NextResponse.json({ error: 'Geen berichten' }, { status: 400 })
    }

    const systemPrompt = context
      ? `Je bent een AI-assistent gespecialiseerd in tender-analyse en aanbestedingen.

Huidige context:
${context}

Beantwoord vragen over deze tender specifiek en gebruik de beschikbare informatie.
Antwoord altijd in het Nederlands tenzij anders gevraagd.`
      : undefined

    // Save session if not exists
    try {
      await sql`
        INSERT INTO chat_sessions (id, tender_id, title)
        VALUES (${sessionId}, ${tenderId ?? null}, 'Chat sessie')
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
      `
    } catch {
      // Session save is non-critical
    }

    // Save user message
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
    if (lastUserMessage) {
      try {
        await sql`
          INSERT INTO chat_messages (session_id, tender_id, role, content)
          VALUES (${sessionId}, ${tenderId ?? null}, 'user', ${lastUserMessage.content})
        `
      } catch {
        // Message save is non-critical
      }
    }

    // Stream response
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        let fullResponse = ''

        try {
          for await (const chunk of streamChat(messages, systemPrompt)) {
            fullResponse += chunk
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
            )
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))

          // Save assistant message
          try {
            await sql`
              INSERT INTO chat_messages (session_id, tender_id, role, content)
              VALUES (${sessionId}, ${tenderId ?? null}, 'assistant', ${fullResponse})
            `
          } catch {
            // Non-critical
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Stream error'
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: message })}\n\n`
            )
          )
        } finally {
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    }
    const message = err instanceof Error ? err.message : 'Chat error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
