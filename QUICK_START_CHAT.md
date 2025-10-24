# Quick Start: AI Chatbot

## 🚀 Your chatbot is ready! Here's how to use it:

### Step 1: Set up API Keys

Create a file `apps/web/.env.local` with:

```bash
# Get from https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-your-openai-key-here

# Get from https://console.upstash.com/redis
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

### Step 2: Install Dependencies (if not already done)

```bash
cd apps/web
npm install @langchain/community @langchain/core
```

OR if using pnpm from the root:

```bash
pnpm add @langchain/community @langchain/core --filter web
```

**Note**: Other packages (langchain, @langchain/openai, @upstash/redis, ai, openai) were already installed.

### Step 3: Start the App

```bash
pnpm dev
```

### Step 4: Test It!

Visit these URLs:
- **Public Chat**: http://localhost:3000/chat
- **Your Dashboard**: http://localhost:3000/home (after login)

## 🎯 What You Get

✅ **ChatGPT-like Interface** - Modern, responsive chat UI
✅ **Conversation Memory** - Remembers context for 24 hours
✅ **Public Access** - `/chat` page works without login
✅ **Dashboard Integration** - Available on home pages
✅ **LangChain Runnables** - Modern, flexible AI architecture
✅ **Redis Persistence** - Conversations stored in Upstash

## 🔑 Getting API Keys

### OpenAI (Required)
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)

### Upstash Redis (Required)
1. Go to https://upstash.com/
2. Sign up for free account
3. Click "Create Database"
4. Choose a region close to you
5. Copy the REST URL and REST Token

## 📝 Features

- Real-time AI responses powered by GPT-3.5
- Conversation history persists for 24 hours
- Auto-scroll to latest messages
- Clear conversation functionality
- Start new conversation button
- Works on mobile and desktop
- Accessible from navigation menu
- No database storage (uses Redis only)

## 🎨 Customization

### Change AI Model
Edit `apps/web/app/api/chat/route.ts`:
```typescript
const model = new ChatOpenAI({
  modelName: 'gpt-4', // Change to GPT-4
  temperature: 0.7,
});
```

### Modify System Prompt
Same file, change the system message:
```typescript
['system', 'Your custom instructions here...'],
```

## 📚 Full Documentation

See `apps/web/CHATBOT_IMPLEMENTATION.md` for complete technical details.

## ⚠️ Note About PowerShell

If you see PowerShell execution policy errors when running `pnpm`:

**Option 1**: Run commands from Git Bash or WSL instead
**Option 2**: Allow scripts temporarily:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

This is a Windows security setting, not an issue with the code.

## 🎉 You're Done!

The chatbot is fully implemented and ready to use. Just add your API keys and start chatting!

