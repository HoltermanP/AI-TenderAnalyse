import { ChatInterface } from '@/components/chat/ChatInterface'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Chat',
}

export default function ChatPage() {
  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col space-y-4">
      <div>
        <h1 className="text-2xl font-bold font-grotesk text-off-white">
          <span className="text-blue-light">AI</span> Chat
        </h1>
        <p className="text-slate-ai text-sm mt-1">
          Stel vragen over tenders, aanbestedingen en bid-strategie aan Claude
        </p>
      </div>

      <div className="flex-1 card overflow-hidden">
        <ChatInterface
          placeholder="Vraag iets over tenders, aanbestedingen of bid-strategie..."
        />
      </div>
    </div>
  )
}
