# Google Gemini PDF Chat Integration

## Overview

This implementation integrates **Google Gemini 1.5 Pro** specifically for PDF processing while maintaining **GPT-4o** for regular chat and image analysis. This hybrid approach leverages the strengths of both models:

- **Google Gemini 1.5 Pro**: Advanced PDF document analysis with native file understanding
- **GPT-4o**: Regular chat and vision capabilities for images

## What Changed

### Architecture

```
User Message Flow:
├── Has PDFs? 
│   ├── YES → Use Google Gemini 1.5 Pro
│   │   ├── Upload PDFs to Google File API
│   │   ├── Upload PDFs to Cloudinary (permanent storage)
│   │   ├── Process with Gemini's native PDF understanding
│   │   └── Return response with full message history
│   │
│   └── NO → Use OpenAI GPT-4o
│       ├── Regular text chat
│       ├── Image analysis (if images present)
│       └── Return response with full message history
```

### Key Features

✅ **Dual Model System**: Automatic routing between Gemini (PDFs) and OpenAI (chat/images)
✅ **Native PDF Understanding**: Gemini processes PDFs directly without text extraction
✅ **Message History Preserved**: Full conversation context maintained across model switches
✅ **Cloudinary Storage**: PDFs stored permanently for future reference
✅ **Unified User Experience**: Seamless switching between models (users won't notice)

## Setup Instructions

### 1. Get Google AI API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Get API Key"** or **"Create API Key"**
4. Copy the API key (starts with `AIza...`)

**Important**: The API key is FREE for testing with generous limits. See [pricing](https://ai.google.dev/pricing) for details.

### 2. Add Environment Variable

Add your Google API key to your `.env` or `.env.local` file:

```bash
# Google AI (Gemini) API Key for PDF Processing
GOOGLE_API_KEY=AIzaSy...your-api-key-here
```

### 3. Verify Installation

The required packages are already installed:
- ✅ `@langchain/google-genai` v1.0.0
- ✅ `@google/generative-ai` v0.24.1

### 4. Restart Development Server

```bash
pnpm dev
```

## How It Works

### PDF Processing Flow

1. **User uploads PDF** → Frontend sends PDF as base64 to `/api/chat`

2. **API receives PDF** → Detects PDF in request

3. **Dual Upload**:
   ```typescript
   // Upload to Google File API (for Gemini processing)
   const fileManager = new GoogleAIFileManager(process.env.GOOGLE_API_KEY);
   const uploadResult = await fileManager.uploadFile(tempFilePath, {
     mimeType: 'application/pdf',
     displayName: pdf.name,
   });
   
   // Upload to Cloudinary (for permanent storage)
   const cloudinaryUrl = await uploadToCloudinary(pdf.base64, ...);
   ```

4. **Gemini Processing**:
   ```typescript
   const geminiModel = new ChatGoogleGenerativeAI({
     modelName: 'gemini-1.5-pro',
     temperature: 0.7,
     apiKey: process.env.GOOGLE_API_KEY,
     maxOutputTokens: 8192,
   });
   
   // Gemini receives file URI and processes natively
   const response = await geminiModel.invoke([
     ...previousMessages,  // Full conversation history
     {
       role: 'user',
       content: [
         { type: 'text', text: message },
         { type: 'file', fileUri: geminiFileUri, mimeType: 'application/pdf' }
       ]
     }
   ]);
   ```

5. **Response** → Saved to message history → Returned to frontend

### Message History Handling

**Critical**: Message history is preserved across model switches:

```typescript
// Load previous messages (from Redis/Upstash)
const previousMessages = await messageHistory.getMessages();

// Convert for Gemini (if PDFs present)
const contextMessages = previousMessages.map((msg) => {
  const role = msg._getType() === 'human' ? 'user' : 'model';
  // Extract text content for context
  return { role, content: extractText(msg.content) };
});

// Include in Gemini request
const response = await geminiModel.invoke([
  ...contextMessages,  // Full history
  currentMessage       // Current question with PDF
]);
```

This ensures users can:
- Ask follow-up questions about PDFs
- Reference previous conversations
- Mix text, images, and PDFs in same conversation

## Gemini File API URLs

### Key Endpoints Used

The integration uses the following Google AI services:

1. **File Upload API**:
   ```
   https://generativelanguage.googleapis.com/upload/v1beta/files
   ```
   - Used to upload PDFs for processing
   - Returns a file URI (e.g., `gs://generativeai-uploads/...`)

2. **Gemini API**:
   ```
   https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent
   ```
   - Used to send messages and file references
   - Processes PDFs natively using file URIs

3. **Authentication**:
   ```
   ?key=YOUR_API_KEY
   ```
   - All requests include API key as query parameter

### File URI Format

When a PDF is uploaded, Google returns a file URI:
```
gs://generativeai-uploads/temp/abc123xyz.pdf
```

This URI is passed to Gemini for processing:
```typescript
{
  type: 'file',
  fileUri: 'gs://generativeai-uploads/temp/abc123xyz.pdf',
  mimeType: 'application/pdf'
}
```

## Usage Example

### Frontend Code (Already Implemented)

```typescript
// User uploads PDF
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What are the key findings in this research paper?',
    sessionId: 'user-session-123',
    pdfs: [{
      name: 'research-paper.pdf',
      base64: 'data:application/pdf;base64,JVBERi0x...',
      numPages: 15
    }]
  })
});

const data = await response.json();
console.log(data.message); // Gemini's analysis of the PDF
```

### Follow-up Questions

```typescript
// Next question (no PDF needed - uses conversation history)
const response2 = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Can you elaborate on the methodology section?',
    sessionId: 'user-session-123', // Same session
  })
});

// Gemini remembers the PDF and previous conversation
const data2 = await response2.json();
```

## Model Specifications

### Google Gemini 1.5 Pro

- **Model**: `gemini-1.5-pro`
- **Context Window**: 1 million tokens (massive!)
- **Max Output**: 8,192 tokens
- **Temperature**: 0.7
- **Best For**: PDF analysis, long documents, multimodal understanding
- **Pricing**: Free tier available, then pay-as-you-go

### GPT-4o (Existing)

- **Model**: `gpt-4o`
- **Context Window**: 128k tokens
- **Max Output**: 4,096 tokens
- **Temperature**: 0.7
- **Best For**: Regular chat, image analysis
- **Pricing**: Per your OpenAI plan

## Benefits

### 1. Native PDF Processing
- No text extraction needed
- Understands document structure, tables, diagrams
- Better accuracy than text-only approaches

### 2. Cost Optimization
- Use Gemini's free tier for PDFs
- Use OpenAI for regular chat
- Pay only for what you need

### 3. Message History Continuity
- Seamless conversation flow
- Users can mix PDFs, images, and text
- Full context preserved

### 4. Scalability
- Cloudinary stores PDFs permanently
- Google File API handles temporary processing
- Redis/Upstash manages conversation history

## Testing

### Test with PDF

1. **Upload a PDF** in your chat interface
2. **Ask a question**: "Summarize this document"
3. **Check console** for:
   ```
   Processing PDFs with Google Gemini
   Uploaded PDF to Google File API: gs://...
   Gemini response received
   ```

### Test Message History

1. **Upload PDF** → Ask question → Get response
2. **Follow-up** (no PDF) → "Tell me more about section 3"
3. **Verify** → Gemini remembers the PDF context

### Test Error Handling

1. **Missing API key** → Should return 500 error
2. **Invalid PDF** → Should handle gracefully
3. **Network error** → Should retry or fail gracefully

## Troubleshooting

### Error: "PDF processing service is not properly configured"

**Solution**: Add `GOOGLE_API_KEY` to your `.env` file

### Error: "Gemini API error: Invalid file URI"

**Solution**: Check that PDF upload completed successfully. Verify temp file path.

### Peer Dependency Warnings

The warnings about `@langchain/core` versions are expected and safe to ignore. The packages are compatible.

### PDFs Not Processing

1. Check `GOOGLE_API_KEY` is set
2. Verify PDF is valid base64
3. Check console logs for upload errors
4. Ensure temp directory `/tmp/` is writable (or adjust path for Windows)

### Windows Temp Path Issue

If running on Windows, update the temp path in `route.ts`:

```typescript
// Change from:
const tempFilePath = `/tmp/${sessionId}-${pdf.name}`;

// To:
import os from 'os';
const tempFilePath = `${os.tmpdir()}/${sessionId}-${pdf.name}`;
```

## Next Steps

### Optional Enhancements

1. **Context Caching**: Use Gemini's caching for repeated PDF queries
2. **Streaming**: Implement streaming responses for better UX
3. **PDF Metadata**: Extract and display page numbers with citations
4. **Multi-PDF**: Enhance to compare multiple PDFs simultaneously
5. **Code Execution**: Use Gemini's code execution for data analysis

### Reference Links

- [Gemini API Docs](https://ai.google.dev/docs)
- [LangChain Gemini Docs](https://js.langchain.com/docs/integrations/chat/google_generativeai/)
- [File API Guide](https://ai.google.dev/api/files)
- [Pricing](https://ai.google.dev/pricing)

## Summary

You now have a **dual-model chat system**:
- 🟦 **Gemini**: Handles PDFs with native understanding
- 🟩 **GPT-4o**: Handles regular chat and images

Both models share the **same conversation history**, providing a seamless experience for users while optimizing cost and performance.

---

**Need Help?** Check the console logs for detailed error messages and processing flows.

