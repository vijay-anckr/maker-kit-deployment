# Install Chat Dependencies

## Required Packages

The chat implementation requires these LangChain packages:

```bash
# Using npm
npm install @langchain/community @langchain/core

# Using yarn
yarn add @langchain/community @langchain/core

# Using pnpm (from project root)
pnpm add @langchain/community @langchain/core --filter web
```

## Why These Packages?

- **@langchain/community**: Provides `UpstashRedisChatMessageHistory` - the official LangChain integration for Upstash Redis
- **@langchain/core**: Core LangChain abstractions including `RunnableWithMessageHistory`, prompts, and base classes

## Already Installed

These were added during initial setup:
- ✅ `langchain` - LangChain framework
- ✅ `@langchain/openai` - OpenAI integration
- ✅ `@upstash/redis` - Upstash Redis client
- ✅ `ai` - Vercel AI SDK
- ✅ `openai` - OpenAI SDK

## If PowerShell Blocks Installation

If you see execution policy errors in PowerShell:

### Option 1: Use Git Bash or WSL
```bash
pnpm add @langchain/community @langchain/core --filter web
```

### Option 2: Temporarily Allow Scripts
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then run the installation command again.

### Option 3: Run from Command Prompt
```cmd
cd apps\web
npm install @langchain/community @langchain/core
```

## Verify Installation

After installing, verify the packages are in `apps/web/package.json`:

```json
{
  "dependencies": {
    "@langchain/community": "^0.3.22",
    "@langchain/core": "^0.3.30",
    "@langchain/openai": "^1.0.0",
    "langchain": "^1.0.1",
    // ... other dependencies
  }
}
```

## Next Steps

Once installed:
1. Add your API keys to `.env.local`
2. Run `pnpm dev`
3. Visit http://localhost:3000/chat

The implementation is already updated to use the official LangChain Upstash integration!

