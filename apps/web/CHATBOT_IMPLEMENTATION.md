# AI Chatbot Implementation Guide

This document describes the implementation of a ChatGPT-like chatbot using LangChain, OpenAI, and Upstash Redis.

## Overview

The chatbot provides:
- **Conversational AI** powered by OpenAI GPT-3.5 Turbo
- **Persistent memory** using Upstash Redis (24-hour retention)
- **LangChain Runnables** for flexible conversation chains
- **Public access** via `/chat` page (no login required)
- **User dashboard integration** for logged-in users

## Architecture

### 1. Backend API (`/api/chat`)

**File**: `apps/web/app/api/chat/route.ts`

The API implements three endpoints using LangChain's Runnable pattern:

#### POST `/api/chat`
- Accepts: `{ message: string, sessionId: string }`
- Returns: `{ message: string, sessionId: string }`
- Uses `RunnableWithMessageHistory` for conversation continuity
- Automatically manages conversation history in Redis

#### GET `/api/chat?sessionId=xxx`
- Retrieves conversation history for a session
- Returns: `{ history: Array<{role, content}>, sessionId }`

#### DELETE `/api/chat?sessionId=xxx`
- Clears conversation history for a session
- Returns: `{ success: boolean, message: string }`

### 2. Key Components

#### UpstashChatMessageHistory
Custom implementation of `BaseChatMessageHistory` that:
- Stores messages in Upstash Redis
- Converts between LangChain message types and Redis storage format
- Implements 24-hour auto-expiration
- Handles message retrieval, addition, and clearing

#### Runnable Chain Structure
```typescript
const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful AI assistant...'],
  new MessagesPlaceholder('chat_history'),
  ['human', '{input}'],
]);

const chain = RunnableSequence.from([prompt, model]);

const chainWithHistory = new RunnableWithMessageHistory({
  runnable: chain,
  getMessageHistory: (sessionId) => new UpstashChatMessageHistory(sessionId),
  inputMessagesKey: 'input',
  historyMessagesKey: 'chat_history',
});
```

### 3. Frontend Components

**Location**: `apps/web/app/(marketing)/_components/`

#### ChatInterface
- Main container component
- Manages session state and localStorage
- Handles message sending and history loading
- Provides clear/refresh functionality

#### ChatMessages
- Displays conversation history
- Auto-scrolls to latest message
- Shows loading indicators
- Handles empty states

#### ChatMessage
- Individual message component
- Distinguishes user vs assistant messages
- Shows avatars and styling

#### ChatInput
- Message input with textarea
- Submit via button or Enter key
- Shift+Enter for new lines
- Shows loading state

### 4. Pages

#### Public Chat Page
**Location**: `apps/web/app/(marketing)/chat/page.tsx`
- Accessible at `/chat` (no authentication required)
- Standalone chat interface
- SEO optimized with metadata

#### User Dashboard Integration
**Files**: 
- `apps/web/app/home/(user)/page.tsx`
- `apps/web/app/home/[account]/page.tsx`

Chat interface integrated into both personal and team dashboards for logged-in users.

### 5. Navigation

Chat link added to:
- **Site Navigation**: `apps/web/app/(marketing)/_components/site-navigation.tsx`
- **Translation**: `apps/web/public/locales/en/marketing.json`

## Environment Variables

Required environment variables (add to `.env.local`):

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token-here
```

## Getting Started

### 1. Install Dependencies

Dependencies already added to `apps/web/package.json`:
- `langchain` - LangChain framework
- `@langchain/openai` - OpenAI integration
- `@langchain/core` - Core abstractions and Runnables
- `@upstash/redis` - Upstash Redis client
- `ai` - Vercel AI SDK
- `openai` - OpenAI SDK

If needed, install with:
```bash
pnpm --filter web add langchain @langchain/openai @langchain/core @upstash/redis ai openai
```

### 2. Configure Environment

1. Create an OpenAI account at https://platform.openai.com/
2. Generate an API key from the OpenAI dashboard
3. Create an Upstash Redis database at https://upstash.com/
4. Copy the REST URL and token from Upstash dashboard
5. Add credentials to `.env.local`

### 3. Run the Application

```bash
pnpm dev
```

Visit:
- Public chat: http://localhost:3000/chat
- User dashboard: http://localhost:3000/home (requires login)

## Features

### Conversation Memory
- Conversations persist for 24 hours in Redis
- Automatic session management via localStorage
- Each browser/device gets unique session ID
- History automatically loaded on page refresh

### User Experience
- Real-time message streaming preparation (infrastructure ready)
- Auto-scroll to latest messages
- Loading indicators during AI response
- Error handling with user-friendly messages
- Clear conversation functionality
- Start new conversation option

### Security
- API validates all inputs
- Environment variables never exposed to client
- Redis keys use session-specific prefixes
- 24-hour auto-expiration prevents data accumulation

## Customization

### Change AI Model
Edit `apps/web/app/api/chat/route.ts`:
```typescript
const model = new ChatOpenAI({
  modelName: 'gpt-4', // or 'gpt-4-turbo-preview', etc.
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});
```

### Modify System Prompt
Edit the system message in the prompt template:
```typescript
const prompt = ChatPromptTemplate.fromMessages([
  ['system', 'Your custom system prompt here...'],
  new MessagesPlaceholder('chat_history'),
  ['human', '{input}'],
]);
```

### Adjust Memory Retention
Change the Redis expiration time:
```typescript
await redis.set(key, serializedMessages, {
  ex: 60 * 60 * 48, // 48 hours instead of 24
});
```

### Enable Streaming (Future Enhancement)
The infrastructure is ready for streaming. To enable:
1. Modify the API to use `stream()` instead of `invoke()`
2. Return a streaming response
3. Update frontend to handle streamed chunks

## Technical Details

### Why LangChain Runnables?
- **Modern pattern**: Replaces older Chain-based approach
- **Composable**: Easy to extend with additional processing
- **Type-safe**: Better TypeScript support
- **Flexible**: Support for streaming, batching, async operations
- **Maintainable**: Clear separation of concerns

### Why Upstash Redis?
- **Serverless**: No infrastructure management
- **REST API**: Works in edge environments
- **Built-in expiration**: Automatic cleanup
- **Global replication**: Low latency worldwide
- **Free tier**: Generous limits for development

### Session Management
- Session ID format: `session_${timestamp}_${random}`
- Stored in localStorage as `chatSessionId`
- Persists across page refreshes
- Unique per browser/device

## Troubleshooting

### "Chat service is not properly configured"
- Verify environment variables are set correctly
- Check `.env.local` file exists and is loaded
- Restart development server after adding variables

### Messages not persisting
- Verify Upstash Redis credentials
- Check Redis dashboard for connection errors
- Ensure session ID is being sent with each request

### TypeScript errors
- Run `pnpm typecheck` to identify issues
- Ensure all dependencies are properly installed
- Check import paths are correct

## Future Enhancements

Potential improvements:
- [ ] Real-time streaming responses
- [ ] Message editing and regeneration
- [ ] Conversation branching
- [ ] Export conversation history
- [ ] Voice input/output
- [ ] Image attachments
- [ ] Multi-language support
- [ ] Custom AI personalities
- [ ] Rate limiting per session
- [ ] Analytics and usage tracking

## Resources

- [LangChain Documentation](https://js.langchain.com/docs/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Upstash Redis Docs](https://docs.upstash.com/redis)
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

