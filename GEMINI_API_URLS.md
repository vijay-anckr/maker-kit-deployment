# Google Gemini API URLs - Complete Reference

## What URLs Does Gemini Use?

When you use Google Gemini for PDF chat, your application communicates with Google's AI services through these endpoints:

---

## 🌐 Base URL

```
https://generativelanguage.googleapis.com
```

This is Google's Generative Language API base URL. All Gemini requests go to this domain.

---

## 📤 1. File Upload Endpoint

### URL
```
https://generativelanguage.googleapis.com/upload/v1beta/files
```

### Purpose
Upload PDFs to Google's servers for processing

### Method
`POST`

### Authentication
```
?key=YOUR_GOOGLE_API_KEY
```

### Example Request
```typescript
// Your implementation uses GoogleAIFileManager which calls this:
const fileManager = new GoogleAIFileManager(process.env.GOOGLE_API_KEY);
const uploadResult = await fileManager.uploadFile('/path/to/file.pdf', {
  mimeType: 'application/pdf',
  displayName: 'my-document.pdf'
});

// Behind the scenes, this calls:
// POST https://generativelanguage.googleapis.com/upload/v1beta/files?key=YOUR_KEY
```

### Response Format
```json
{
  "file": {
    "name": "files/abc123xyz",
    "displayName": "my-document.pdf",
    "mimeType": "application/pdf",
    "sizeBytes": "1234567",
    "createTime": "2025-10-27T12:00:00.000000Z",
    "updateTime": "2025-10-27T12:00:00.000000Z",
    "expirationTime": "2025-10-29T12:00:00.000000Z",
    "sha256Hash": "abc123...",
    "uri": "https://generativelanguage.googleapis.com/v1beta/files/abc123xyz",
    "state": "ACTIVE"
  }
}
```

### File URI Format
The uploaded file gets a URI like:
```
https://generativelanguage.googleapis.com/v1beta/files/abc123xyz
```

This URI is then used to reference the file in chat requests.

---

## 💬 2. Chat/Generation Endpoint

### URL
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent
```

### Purpose
Send messages with PDF references and get AI-generated responses

### Method
`POST`

### Authentication
```
?key=YOUR_GOOGLE_API_KEY
```

### Full URL Example
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=AIzaSy...
```

### Example Request Body
```json
{
  "contents": [
    {
      "role": "user",
      "parts": [
        {
          "text": "What are the key findings in this document?"
        },
        {
          "fileData": {
            "mimeType": "application/pdf",
            "fileUri": "https://generativelanguage.googleapis.com/v1beta/files/abc123xyz"
          }
        }
      ]
    }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 8192
  }
}
```

### Example Response
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          {
            "text": "Based on the document, the key findings are:\n1. ..."
          }
        ],
        "role": "model"
      },
      "finishReason": "STOP",
      "index": 0,
      "safetyRatings": [...]
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 12450,
    "candidatesTokenCount": 385,
    "totalTokenCount": 12835
  }
}
```

---

## 📋 3. File Metadata Endpoint

### URL
```
https://generativelanguage.googleapis.com/v1beta/files/{file_id}
```

### Purpose
Get information about an uploaded file

### Method
`GET`

### Example
```
GET https://generativelanguage.googleapis.com/v1beta/files/abc123xyz?key=YOUR_KEY
```

---

## 🗑️ 4. File Deletion Endpoint

### URL
```
https://generativelanguage.googleapis.com/v1beta/files/{file_id}
```

### Purpose
Delete an uploaded file from Google's servers

### Method
`DELETE`

### Example
```
DELETE https://generativelanguage.googleapis.com/v1beta/files/abc123xyz?key=YOUR_KEY
```

### Note
Files auto-expire after 48 hours, so manual deletion is optional.

---

## 🔐 Authentication Format

All requests require your API key:

### Query Parameter (Recommended)
```
https://generativelanguage.googleapis.com/v1beta/...?key=YOUR_API_KEY
```

### Header (Alternative)
```http
x-goog-api-key: YOUR_API_KEY
```

---

## 🔄 How Your Implementation Uses These URLs

### Step 1: Upload PDF to Google
```typescript
// File: apps/web/app/api/chat/route.ts

const fileManager = new GoogleAIFileManager(process.env.GOOGLE_API_KEY);

// This calls: POST https://generativelanguage.googleapis.com/upload/v1beta/files
const uploadResult = await fileManager.uploadFile(tempFilePath, {
  mimeType: 'application/pdf',
  displayName: pdf.name,
});

// Returns file URI: https://generativelanguage.googleapis.com/v1beta/files/abc123xyz
```

### Step 2: Send Chat Request with File Reference
```typescript
// Initialize Gemini model
const geminiModel = new ChatGoogleGenerativeAI({
  model: 'gemini-1.5-pro',
  apiKey: process.env.GOOGLE_API_KEY,
});

// This calls: POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent
const response = await geminiModel.invoke([
  {
    role: 'user',
    content: [
      { type: 'text', text: message },
      { type: 'file', fileUri: uploadResult.file.uri, mimeType: 'application/pdf' }
    ]
  }
]);
```

---

## 🌍 Regional Endpoints

Gemini API uses the same URLs globally, but you can specify regional endpoints if needed:

### Default (Global)
```
https://generativelanguage.googleapis.com
```

### US-Specific (if needed)
```
https://us-generativelanguage.googleapis.com
```

### EU-Specific (if needed)
```
https://eu-generativelanguage.googleapis.com
```

**Note:** Your implementation uses the default global endpoint.

---

## 📊 Rate Limits

| Endpoint | Free Tier Limit |
|----------|-----------------|
| File Upload | 60 requests/minute |
| Generate Content | 60 requests/minute |
| File Metadata | 60 requests/minute |

**Pro Tier:** Higher limits available. See [pricing](https://ai.google.dev/pricing).

---

## 🔍 URL Structure Breakdown

### Generation Endpoint Anatomy

```
https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=YOUR_KEY
│                                          │       │      │              │
│                                          │       │      │              └── Method
│                                          │       │      └────────────────── Model name
│                                          │       └───────────────────────── Resource type
│                                          └───────────────────────────────── API version
└──────────────────────────────────────────────────────────────────────────── Base URL
```

### File Upload Endpoint Anatomy

```
https://generativelanguage.googleapis.com/upload/v1beta/files?key=YOUR_KEY
│                                          │       │       │
│                                          │       │       └──────────────── Resource type
│                                          │       └──────────────────────── API version
│                                          └──────────────────────────────── Upload path
└──────────────────────────────────────────────────────────────────────────── Base URL
```

---

## 🛠️ Testing URLs

### Test File Upload
```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/upload/v1beta/files?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "file": {
      "mimeType": "application/pdf",
      "displayName": "test.pdf"
    }
  }'
```

### Test Chat Generation
```bash
curl -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{
      "parts": [{
        "text": "Hello, Gemini!"
      }]
    }]
  }'
```

---

## 📝 Important Notes

### File Storage Duration
- Uploaded files are stored temporarily (48 hours)
- After 48 hours, files are automatically deleted
- You don't need to manually delete them (but you can)

### File URI Format
- URIs are used internally by Gemini
- Don't expose file URIs to users (they expire)
- Use Cloudinary URLs for permanent storage

### API Key Security
- **Never expose API keys in client-side code**
- Always use server-side API calls
- Store keys in environment variables
- Rotate keys periodically

---

## 🎯 Summary: The URLs You're Using

When a user uploads a PDF to your chat:

1. **Your Frontend** → Sends PDF to your API
   ```
   POST /api/chat
   ```

2. **Your Backend** → Uploads PDF to Google
   ```
   POST https://generativelanguage.googleapis.com/upload/v1beta/files?key=YOUR_KEY
   ```

3. **Your Backend** → Sends message with PDF reference to Gemini
   ```
   POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=YOUR_KEY
   ```

4. **Gemini** → Processes PDF and returns response

5. **Your Backend** → Returns response to frontend

---

## 🔗 Official Documentation

- **API Reference:** https://ai.google.dev/api/rest
- **File API Guide:** https://ai.google.dev/gemini-api/docs/vision#upload-file
- **Authentication:** https://ai.google.dev/gemini-api/docs/api-key
- **Pricing:** https://ai.google.dev/pricing
- **Status Page:** https://status.ai.google.dev/

---

## ✅ Quick Checklist

- ✅ Base URL: `https://generativelanguage.googleapis.com`
- ✅ Upload endpoint: `/upload/v1beta/files`
- ✅ Generate endpoint: `/v1beta/models/gemini-1.5-pro:generateContent`
- ✅ Authentication: Query param `?key=YOUR_API_KEY`
- ✅ Files expire: After 48 hours
- ✅ Rate limit: 60 requests/minute (free tier)

---

**Your implementation handles all these URLs automatically through the LangChain library!** You just need to provide the `GOOGLE_API_KEY` and the rest is taken care of.

