'use client';

import { cn } from '@kit/ui/utils';
import { Avatar } from '@kit/ui/avatar';
import { Bot, User } from 'lucide-react';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 rounded-lg p-4',
        isUser ? 'bg-primary/10' : 'bg-muted/50',
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <div
          className={cn(
            'flex h-full w-full items-center justify-center',
            isUser ? 'bg-primary' : 'bg-secondary',
          )}
        >
          {isUser ? (
            <User className="h-4 w-4 text-primary-foreground" />
          ) : (
            <Bot className="h-4 w-4 text-secondary-foreground" />
          )}
        </div>
      </Avatar>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">
            {isUser ? 'You' : 'AI Assistant'}
          </span>
        </div>
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
}


