'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { Button } from '@kit/ui/button';
import { Card } from '@kit/ui/card';
import { Trash2, RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';

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

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Generate or retrieve session ID
  useEffect(() => {
    const storedSessionId = localStorage.getItem('chatSessionId');

    if (storedSessionId) {
      setSessionId(storedSessionId);
      loadChatHistory(storedSessionId);
    } else {
      const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem('chatSessionId', newSessionId);
      setSessionId(newSessionId);
      setIsLoadingHistory(false);
    }
  }, []);

  // Load chat history from server
  const loadChatHistory = async (sessionId: string) => {
    try {
      setIsLoadingHistory(true);
      const response = await fetch(`/api/chat?sessionId=${sessionId}`);

      if (!response.ok) {
        throw new Error('Failed to load chat history');
      }

      const data = await response.json();

      if (data.history && Array.isArray(data.history)) {
        setMessages(data.history);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Send message to API
  const sendMessage = useCallback(
    async (content: string, images?: string[], pdfs?: PDFDocument[]) => {
      if (!sessionId) {
        console.error('No session ID available');
        return;
      }

      // Create user message with images if present
      let userMessageContent: string | ContentPart[];
      
      if (images && images.length > 0) {
        userMessageContent = [
          { type: 'text' as const, text: content },
          ...images.map((url) => ({
            type: 'image_url' as const,
            image_url: { url },
          })),
        ];
      } else {
        userMessageContent = content;
      }

      // Add user message to UI immediately
      const userMessage: Message = {
        role: 'user',
        content: userMessageContent,
        isMultimodal: images && images.length > 0,
        pdfs: pdfs,
      };
      
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content,
            sessionId: sessionId,
            images: images,
            pdfs: pdfs,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to send message');
        }

        const data = await response.json();

        // Update user message with actual Cloudinary URLs if files were uploaded
        if (data.imageUrls && data.imageUrls.length > 0) {
          setMessages((prev) => {
            const updatedMessages = [...prev];
            const lastIndex = updatedMessages.length - 1;
            
            if (lastIndex >= 0 && updatedMessages[lastIndex].role === 'user') {
              const lastMessage = updatedMessages[lastIndex];
              
              // Update image URLs to use Cloudinary secure URLs
              if (Array.isArray(lastMessage.content)) {
                lastMessage.content = lastMessage.content.map((part, index) => {
                  if (part.type === 'image_url' && data.imageUrls[index]) {
                    return {
                      ...part,
                      image_url: {
                        url: data.imageUrls[index],
                      },
                    };
                  }
                  return part;
                });
              }
            }
            
            return updatedMessages;
          });
        }

        // Add assistant response
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.message,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        console.error('Error sending message:', error);

        // Add error message
        const errorMessage: Message = {
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        };

        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [sessionId],
  );

  // Clear chat history
  const clearChat = async () => {
    if (!sessionId) return;

    try {
      await fetch(`/api/chat?sessionId=${sessionId}`, {
        method: 'DELETE',
      });

      setMessages([]);
    } catch (error) {
      console.error('Error clearing chat:', error);
    }
  };

  // Start new conversation
  const startNewConversation = () => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('chatSessionId', newSessionId);
    setSessionId(newSessionId);
    setMessages([]);
  };

  if (isLoadingHistory) {
    return (
      <Card className="flex h-[600px] items-center justify-center">
        <div className="text-center space-y-2">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Loading conversation...
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h2 className="text-lg font-semibold">AI Chat Assistant</h2>
          <p className="text-sm text-muted-foreground">
            Powered by OpenAI and LangChain
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={startNewConversation}
            title="Start new conversation"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={messages.length === 0}
                title="Clear conversation"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear conversation?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete all messages in the current conversation.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearChat}>
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden p-4">
        <ChatMessages messages={messages} isLoading={isLoading} />
      </div>

      {/* Input Area */}
      <div className="border-t p-4">
        <ChatInput
          onSendMessage={sendMessage}
          isLoading={isLoading}
          disabled={!sessionId}
        />
      </div>
    </Card>
  );
}

