'use client';

import { cn } from '@kit/ui/utils';
import { Avatar } from '@kit/ui/avatar';
import { Bot, User, FileText } from 'lucide-react';

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

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string | ContentPart[];
  isMultimodal?: boolean;
  pdfs?: PDFDocument[];
}

export function ChatMessage({
  role,
  content,
  isMultimodal = false,
  pdfs,
}: ChatMessageProps) {
  const isUser = role === 'user';

  // Extract text and images from multimodal content
  const renderContent = () => {
    if (!isMultimodal || typeof content === 'string') {
      return (
        <div className="space-y-3">
          {/* Display PDFs if present */}
          {pdfs && pdfs.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {pdfs.map((pdf, index) => (
                <div
                  key={index}
                  className="h-16 w-28 border rounded-lg bg-muted flex flex-col items-center justify-center p-2"
                >
                  <FileText className="h-6 w-6 text-muted-foreground" />
                  <span className="text-xs mt-1 truncate w-full text-center">
                    {pdf.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Display text content */}
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {content as string}
          </div>
        </div>
      );
    }

    // Multimodal content
    const contentParts = content as ContentPart[];
    const textParts = contentParts.filter((part) => part.type === 'text');
    const imageParts = contentParts.filter((part) => part.type === 'image_url');

    return (
      <div className="space-y-3">
        {/* Display PDFs if present */}
        {pdfs && pdfs.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {pdfs.map((pdf, index) => (
              <div
                key={index}
                className="h-16 w-28 border rounded-lg bg-muted flex flex-col items-center justify-center p-2"
              >
                <FileText className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs mt-1 truncate w-full text-center">
                  {pdf.name}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Display images first */}
        {imageParts.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {imageParts.map((part, index) => (
              <div key={index} className="relative group">
                <img
                  src={part.image_url?.url}
                  alt={`Image ${index + 1}`}
                  className="max-w-xs max-h-48 object-contain rounded-lg border"
                />
              </div>
            ))}
          </div>
        )}

        {/* Display text */}
        {textParts.map((part, index) => (
          <div key={index} className="text-sm leading-relaxed whitespace-pre-wrap">
            {part.text}
          </div>
        ))}
      </div>
    );
  };

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
        {renderContent()}
      </div>
    </div>
  );
}


