# Quick Start: Google Gemini PDF Chat

## 🚀 Get Started in 3 Steps

### Step 1: Get Your Google API Key (2 minutes)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key (starts with `AIza...`)

**Free Tier**: 60 requests/minute, generous token limits. [See pricing](https://ai.google.dev/pricing)

### Step 2: Add to Environment Variables (1 minute)

Add this line to your `.env` or `.env.local` file:

```bash
GOOGLE_API_KEY=AIzaSy...your-key-here
```

### Step 3: Restart Your Dev Server (30 seconds)

```bash
pnpm dev
```

**That's it!** 🎉 Your PDF chat now uses Google Gemini!

---

## How It Works

```
┌─────────────────────────────────────────┐
│  User uploads PDF & asks question       │
└────────────────┬────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────┐
    │  Has PDF?                  │
    └──────┬─────────────────────┘
           │
     ┌─────┴──────┐
     │            │
    YES          NO
     │            │
     ▼            ▼
┌─────────┐  ┌──────────┐
│ Gemini  │  │  GPT-4o  │
│ 1.5 Pro │  │  Vision  │
└─────────┘  └──────────┘
     │            │
     └─────┬──────┘
           │
           ▼
    ┌──────────────┐
    │   Response   │
    │   + History  │
    └──────────────┘
```

**Key Features:**
- ✅ Automatic model selection
- ✅ Conversation history preserved
- ✅ Mix PDFs, images, and text freely
- ✅ No changes needed on frontend

---

## Testing

### Test 1: Upload a PDF

1. Open your chat interface
2. Upload any PDF (research paper, receipt, document)
3. Ask: "What is this document about?"
4. **Expected**: Detailed summary from Gemini

### Test 2: Follow-up Question

1. Ask: "Can you elaborate on the key points?"
2. **Expected**: Gemini responds with context from the PDF

### Test 3: Mix Content Types

1. Upload an image (uses GPT-4o)
2. Upload a PDF (uses Gemini)
3. Ask text questions (uses GPT-4o)
4. **Expected**: All work seamlessly in same conversation

---

## URLs & Endpoints

### Gemini API Endpoints

Your implementation uses these Google AI services:

1. **File Upload**:
   ```
   https://generativelanguage.googleapis.com/upload/v1beta/files
   ```
   - Uploads PDFs for processing
   - Returns file URI: `gs://generativeai-uploads/...`

2. **Chat/Generate Content**:
   ```
   https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent
   ```
   - Sends messages with file references
   - Returns AI-generated responses

3. **Authentication**:
   ```
   ?key=YOUR_API_KEY
   ```

### Internal Endpoints (Your App)

- **Chat API**: `POST /api/chat`
  - Handles text, images, and PDFs
  - Routes to appropriate model
  - Manages message history

- **Get History**: `GET /api/chat?sessionId=xxx`
  - Retrieves conversation history

- **Clear History**: `DELETE /api/chat?sessionId=xxx`
  - Clears conversation

---

## Troubleshooting

### ❌ Error: "PDF processing service is not properly configured"

**Fix**: Add `GOOGLE_API_KEY` to your `.env` file and restart dev server

### ❌ PDFs not uploading

**Check**:
1. Is `GOOGLE_API_KEY` set? 
2. Is the PDF valid?
3. Check browser console for errors

### ❌ Peer dependency warnings

**Safe to ignore**. The packages work fine despite warnings.

### ❌ Windows temp file errors

If you see errors about `/tmp/`, update `apps/web/app/api/chat/route.ts`:

```typescript
import os from 'os';
const tempFilePath = `${os.tmpdir()}/${sessionId}-${pdf.name}`;
```

---

## What Changed?

### Before
```typescript
// Only OpenAI GPT-4o
// Extract text from PDF manually
// Limited PDF understanding
```

### After
```typescript
// Gemini for PDFs (native understanding)
// GPT-4o for chat & images
// Full conversation history
// Automatic routing
```

---

## Cost Comparison

| Provider | Model | Use Case | Cost |
|----------|-------|----------|------|
| Google | Gemini 1.5 Pro | PDFs | **Free tier**, then $0.00035/1K tokens |
| OpenAI | GPT-4o | Chat + Images | Per your plan |

**Savings**: Use Gemini's free tier for PDF processing!

---

## Next Steps

### Optional Enhancements

1. **Streaming Responses**: Show response as it's generated
2. **Context Caching**: Cache PDFs for faster repeated queries
3. **Multi-PDF Comparison**: Compare multiple documents
4. **Citation Extraction**: Show page numbers with quotes

### Learn More

- 📚 [Full Documentation](./GEMINI_PDF_INTEGRATION.md)
- 🔗 [Gemini API Docs](https://ai.google.dev/docs)
- 🦜 [LangChain Gemini](https://js.langchain.com/docs/integrations/chat/google_generativeai/)

---

## Summary

✅ **Installed**: `@langchain/google-genai`, `@google/generative-ai`
✅ **Configured**: Dual model system (Gemini + GPT-4o)
✅ **Ready**: Just add `GOOGLE_API_KEY` and restart!

**Your chat now has:**
- 🤖 Google Gemini for PDF analysis
- 👁️ GPT-4o for images and chat
- 💬 Full conversation history
- 🔄 Seamless model switching

---

**Questions?** Check the [full documentation](./GEMINI_PDF_INTEGRATION.md) or console logs for details.

