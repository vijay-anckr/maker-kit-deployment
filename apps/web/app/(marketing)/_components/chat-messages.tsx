'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage } from './chat-message';
import { ScrollArea } from '@kit/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { cn } from '@kit/ui/utils';

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: string;
  };
}

interface PDFDocument {
  name: string;
  content: string;
  base64: string;
  numPages: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string | ContentPart[];
  isMultimodal?: boolean;
  pdfs?: PDFDocument[];
}

interface ChatMessagesProps {
  messages: Message[];
  isLoading?: boolean;
}

export function ChatMessages({ messages, isLoading = false }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-muted-foreground">
            Start a conversation
          </p>
          <p className="text-sm text-muted-foreground">
            Type a message below to begin chatting with the AI assistant
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-4" ref={scrollRef}>
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            role={message.role}
            content={message.content}
            isMultimodal={message.isMultimodal}
            pdfs={message.pdfs}
          />
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              AI is thinking...
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}


