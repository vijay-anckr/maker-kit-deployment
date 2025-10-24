import { ChatOpenAI } from '@langchain/openai';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { UpstashRedisChatMessageHistory } from '@langchain/community/stores/message/upstash_redis';
import { NextRequest, NextResponse } from 'next/server';

// Environment variables required:
// OPENAI_API_KEY - Your OpenAI API key
// UPSTASH_REDIS_REST_URL - Your Upstash Redis REST URL
// UPSTASH_REDIS_REST_TOKEN - Your Upstash Redis REST token

/**
 * POST /api/chat
 * 
 * Handles chat messages with conversational memory using LangChain Runnables and OpenAI.
 * Stores conversation history in Upstash Redis.
 * 
 * Request body:
 * - message: string - The user's message
 * - sessionId: string - Unique session identifier for conversation continuity
 */
export async function POST(request: NextRequest) {
  try {
    const { message, sessionId } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 },
      );
    }

    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 },
      );
    }

    // Validate environment variables
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Chat service is not properly configured' },
        { status: 500 },
      );
    }

    if (
      !process.env.UPSTASH_REDIS_REST_URL ||
      !process.env.UPSTASH_REDIS_REST_TOKEN
    ) {
      console.error('Upstash Redis credentials are not configured');
      return NextResponse.json(
        { error: 'Chat service is not properly configured' },
        { status: 500 },
      );
    }

    // Initialize OpenAI model
    const model = new ChatOpenAI({
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // Create prompt template with message history placeholder
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        'You are a helpful AI assistant. Provide clear, concise, and accurate responses. Be friendly and professional.',
      ],
      new MessagesPlaceholder('history'),
      ['human', '{question}'],
    ]);

    // Create the runnable chain by piping prompt to model
    const chain = prompt.pipe(model);

    // Wrap the chain with message history management using Upstash Redis
    const chainWithHistory = new RunnableWithMessageHistory({
      runnable: chain,
      getMessageHistory: (sessionId: string) => {
        return new UpstashRedisChatMessageHistory({
          sessionId,
          config: {
            url: process.env.UPSTASH_REDIS_REST_URL!,
            token: process.env.UPSTASH_REDIS_REST_TOKEN!,
          },
        });
      },
      inputMessagesKey: 'question',
      historyMessagesKey: 'history',
    });

    // Invoke the chain with the user's message
    const response = await chainWithHistory.invoke(
      {
        question: message,
      },
      {
        configurable: {
          sessionId: sessionId,
        },
      },
    );

    // Extract the assistant's response
    const assistantMessage =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    // Return the response
    return NextResponse.json({
      message: assistantMessage,
      sessionId: sessionId,
    });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json(
      {
        error: 'An error occurred while processing your request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/chat?sessionId=xxx
 * 
 * Retrieves conversation history for a given session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 },
      );
    }

    // Use UpstashRedisChatMessageHistory to retrieve messages
    const messageHistory = new UpstashRedisChatMessageHistory({
      sessionId,
      config: {
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      },
    });

    const messages = await messageHistory.getMessages();

    // Convert BaseMessage objects to simple format for client
    const conversationHistory = messages.map((msg: any) => ({
      role: msg._getType() === 'human' ? 'user' : 'assistant',
      content: msg.content as string,
    }));

    return NextResponse.json({
      history: conversationHistory,
      sessionId: sessionId,
    });
  } catch (error) {
    console.error('Error retrieving chat history:', error);
    return NextResponse.json(
      {
        error: 'An error occurred while retrieving chat history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/chat?sessionId=xxx
 * 
 * Clears conversation history for a given session
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 },
      );
    }

    // Use UpstashRedisChatMessageHistory to clear messages
    const messageHistory = new UpstashRedisChatMessageHistory({
      sessionId,
      config: {
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      },
    });

    await messageHistory.clear();

    return NextResponse.json({
      success: true,
      message: 'Conversation history cleared',
    });
  } catch (error) {
    console.error('Error clearing chat history:', error);
    return NextResponse.json(
      {
        error: 'An error occurred while clearing chat history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}


