# AI Chatbot with PDF Analysis - Implementation Guide

## Overview

Your chatbot now supports **PDF document analysis** alongside images! Users can upload PDF files, and the AI will extract and analyze the text content, answer questions about the documents, and maintain full conversation history including the PDF context.

## ✨ Key Features

### PDF Capabilities
- ✅ Upload up to 3 PDFs per message
- ✅ Automatic text extraction from PDFs
- ✅ Multi-page document support
- ✅ Answer questions about PDF content
- ✅ Compare multiple PDFs
- ✅ Extract specific information
- ✅ Summarize documents
- ✅ Context-aware follow-up questions

### Combined Multimodal Support
- ✅ **Text + Images + PDFs** in single message
- ✅ All content types stored in conversation history
- ✅ Cross-reference between documents and images
- ✅ 24-hour persistence in Redis
- ✅ Automatic model selection (GPT-4o for advanced content)

## 🏗️ Technical Implementation

### Architecture

```
User Upload PDF → Base64 Encoding → API Receives → 
pdf-parse Extracts Text → Chunked for Token Limits → 
Sent to GPT-4o → AI Analyzes → Response Stored → 
Full Context in Redis
```

### PDF Parser Utility

**File**: `apps/web/app/api/chat/_lib/pdf-parser.ts`

```typescript
// Extract text from PDF buffer
async function extractTextFromPDF(buffer: Buffer): Promise<{
  text: string;
  numPages: number;
  info: any;
}>;

// Convert base64 to Buffer
function base64ToBuffer(base64String: string): Buffer;

// Chunk large PDFs to avoid token limits
function chunkText(text: string, maxChunkSize: number = 15000): string[];
```

### API Changes

**Enhanced Endpoint**: POST `/api/chat`

**Request Body**:
```json
{
  "message": "Summarize this document",
  "sessionId": "session_123",
  "images": ["data:image/jpeg;base64,..."],  // Optional
  "pdfs": [  // Optional
    {
      "name": "report.pdf",
      "content": "",
      "base64": "data:application/pdf;base64,...",
      "numPages": 0
    }
  ]
}
```

**Response**:
```json
{
  "message": "This document discusses...",
  "sessionId": "session_123",
  "hasVision": false,
  "hasPDFs": true,
  "pdfCount": 1
}
```

### PDF Processing Flow

```typescript
// 1. Receive PDF as base64
const pdfs = request.body.pdfs;

// 2. Convert to Buffer
const buffer = base64ToBuffer(pdf.base64);

// 3. Extract text
const { text, numPages } = await extractTextFromPDF(buffer);

// 4. Chunk large documents
const chunks = chunkText(text, 12000);

// 5. Add to message context
const pdfContext = `
--- PDF Document: "${pdf.name}" (${numPages} pages) ---
${chunks[0]}
--- End of PDF ---
`;

// 6. Send to GPT-4o with conversation history
const response = await model.invoke(messages + pdfContext);
```

### Token Management

PDFs are chunked to manage token limits:

- **Max Chunk Size**: 12,000 characters (~3,000 tokens)
- **Strategy**: Uses first chunk for context
- **Large Documents**: Can be enhanced for multi-chunk processing
- **Combined with History**: Previous messages + PDF context

### Model Selection

```typescript
const hasPDFs = pdfs && pdfs.length > 0;
const needsAdvancedModel = hasImages || hasPDFs;

const model = new ChatOpenAI({
  modelName: needsAdvancedModel ? 'gpt-4o' : 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: needsAdvancedModel ? 4096 : undefined,
});
```

## 🎨 UI Components

### ChatInput Component

**New Features**:
- PDF upload button with FileText icon
- PDF preview cards with filename
- Remove individual PDFs
- 3 PDF limit per message
- Combined file input management

```tsx
<Button
  onClick={() => pdfInputRef.current?.click()}
  disabled={pdfs.length >= 3}
  title="Add PDFs (max 3)"
>
  <FileText className="h-5 w-5" />
</Button>
```

### PDF Preview Card

```tsx
<div className="h-20 w-32 border rounded-lg bg-muted">
  <FileText className="h-8 w-8" />
  <span>{pdf.name}</span>
  <button onClick={() => removePDF(index)}>
    <X />
  </button>
</div>
```

### ChatMessage Component

**Enhanced Display**:
- Shows PDF icons with filenames in messages
- Displays PDF info before text content
- Supports multiple PDFs per message
- Works with images + PDFs combined

## 💡 Usage Examples

### Example 1: Document Summarization

**User**: *uploads research_paper.pdf*  
"Summarize the key findings"

**AI**: "This research paper examines the effects of... The key findings include: 1) ..., 2) ..., 3) ..."

### Example 2: Information Extraction

**User**: *uploads invoice.pdf*  
"Extract the total amount, date, and vendor name"

**AI**: "From the invoice:
- Vendor: Acme Corporation
- Date: October 24, 2025
- Total Amount: $1,247.50
- Payment Terms: Net 30"

### Example 3: Document Comparison

**User**: *uploads contract_v1.pdf and contract_v2.pdf*  
"What are the differences between these two contracts?"

**AI**: "Comparing the two contracts, the main differences are:
1. Version 2 includes an additional clause 5.3 regarding...
2. The payment terms changed from Net 30 to Net 45
3. Liability limits increased from $1M to $2M
..."

### Example 4: Question Answering

**User**: *uploads user_manual.pdf*  
"How do I reset the device to factory settings?"

**AI**: "According to the user manual, to reset the device to factory settings:
1. Press and hold the power button for 10 seconds
2. Navigate to Settings > System > Reset
3. Select 'Factory Reset'
4. Confirm by entering your PIN
Note: This will erase all data on the device."

### Example 5: Context-Aware Follow-ups

**User**: *uploads meeting_notes.pdf*  
"What action items were assigned?"

**AI**: "The following action items were assigned:
- John: Prepare Q4 budget proposal (Due: Nov 1)
- Sarah: Schedule client meeting (Due: Oct 28)
- Mike: Update project timeline (Due: Oct 26)"

**User**: "Who has the most urgent task?"

**AI**: "Mike has the most urgent task - updating the project timeline, which is due October 26th, two days from now."

### Example 6: Multi-Modal Analysis

**User**: *uploads screenshot.png and report.pdf*  
"Does the chart in this image match the data in the report?"

**AI**: "Comparing the chart in your image with the data in the report:
- The Q3 revenue in the chart shows $2.4M, which matches page 5 of the report
- However, the Q4 projection in the chart ($2.8M) differs from the report's figure ($2.6M)
- All other data points align correctly"

## 🔧 Configuration

### Adjust PDF Limits

```typescript
// In chat-input.tsx
const MAX_PDFS = 3; // Change to allow more/fewer PDFs
```

### Modify Chunk Size

```typescript
// In route.ts
const chunks = chunkText(text, 15000); // Increase for more context
```

### PDF Processing Options

```typescript
// In pdf-parser.ts
export async function extractTextFromPDF(
  buffer: Buffer,
  options?: {
    // Add options as needed
    maxPages?: number;
    pageRange?: { start: number; end: number };
  }
): Promise<PDFResult> {
  // Custom processing logic
}
```

## 📊 Data Flow

### Upload Process

```
1. User selects PDF file
   ↓
2. FileReader converts to base64
   ↓
3. PDF preview shown in UI
   ↓
4. User sends message
   ↓
5. PDF + message sent to API
   ↓
6. Server converts base64 to Buffer
   ↓
7. pdf-parse extracts text
   ↓
8. Text chunked if needed
   ↓
9. Added to message context
   ↓
10. Sent to GPT-4o
```

### Storage Format

```typescript
interface PDFDocument {
  name: string;        // "report.pdf"
  content: string;     // Extracted text (stored after processing)
  base64: string;      // Original file data
  numPages: number;    // Number of pages
}
```

### Message History

```json
{
  "role": "user",
  "content": "Summarize this document",
  "isMultimodal": false,
  "pdfs": [
    {
      "name": "report.pdf",
      "content": "Extracted text...",
      "base64": "data:application/pdf;base64,...",
      "numPages": 15
    }
  ]
}
```

## 💰 Cost Considerations

### Token Usage

**PDF Text Extraction**:
- Average PDF page: ~500-1000 tokens
- 10-page document: ~5,000-10,000 tokens
- Chunking helps manage large documents

**Model Costs (GPT-4o)**:
- Input: ~$5 per 1M tokens
- 10-page PDF analysis: ~$0.025-0.05

**Optimization Tips**:
1. Chunk large documents (already implemented)
2. Use first chunk for initial analysis
3. Request specific pages if needed
4. Combine multiple questions in one message

### Example Costs

- Text-only: $0.001 per 1K tokens
- Text + 5-page PDF: ~$0.015
- Text + Images + PDF: ~$0.025
- Follow-up questions (with history): ~$0.010

## 🛠️ Installation

### Required Package

```bash
# Install pdf-parse
npm install pdf-parse

# Or with pnpm
pnpm add pdf-parse --filter web
```

### Dependencies Already Included

- ✅ `@langchain/openai` - AI model
- ✅ `@langchain/core` - Core abstractions
- ✅ `@upstash/redis` - Conversation storage

## 🧪 Testing the Feature

### Quick Test Steps:

1. **Start the app**:
   ```bash
   pnpm dev
   ```

2. **Visit**: http://localhost:3000/chat

3. **Click the PDF button** (📄 icon)

4. **Select a PDF** file

5. **Add a question**: "What is this document about?"

6. **Click Send**

7. **Watch AI analyze** the PDF!

### Test Scenarios:

**Scenario 1**: Simple PDF
- Upload: single-page invoice
- Ask: "What's the total amount?"

**Scenario 2**: Multi-page document
- Upload: 10-page report
- Ask: "Summarize the main points"

**Scenario 3**: Multiple PDFs
- Upload: 2-3 related documents
- Ask: "Compare these documents"

**Scenario 4**: PDF + Image
- Upload: PDF report + chart image
- Ask: "Does the chart match the report data?"

**Scenario 5**: Follow-up questions
- Upload: meeting notes PDF
- Ask: "What were the key decisions?"
- Follow-up: "Who is responsible for action item 3?"

## 🔐 Security Considerations

### File Validation

✅ **MIME Type**: Only `application/pdf` accepted  
✅ **File Size**: Consider adding limits (e.g., 10MB max)  
✅ **Content Scanning**: Malware detection recommended for production  
✅ **Base64 Encoding**: Secure transmission  
✅ **No Permanent Storage**: PDFs expire with conversation (24hrs)  

### Privacy

- PDFs only stored in Redis cache (24 hours)
- Text extraction happens server-side
- No persistent PDF storage
- Session-isolated access

### Recommended Additions

```typescript
// Add file size limit
if (file.size > 10 * 1024 * 1024) { // 10MB
  throw new Error('PDF too large');
}

// Add virus scanning
await scanFile(buffer);
```

## 🐛 Troubleshooting

### PDF Not Uploading

**Issue**: PDF button does nothing  
**Solution**: Check browser console, verify file input is working

**Issue**: "Failed to parse PDF"  
**Solution**: Ensure PDF is not corrupted or password-protected

### Text Extraction Issues

**Issue**: No text extracted  
**Solution**: PDF might be scanned images (needs OCR)

**Issue**: Garbled text  
**Solution**: PDF encoding issues, try re-saving PDF

### Token Limit Errors

**Issue**: "Context length exceeded"  
**Solution**: Reduce chunk size or implement pagination

## 📈 Performance Tips

### Optimization Strategies

1. **Chunking**: Already implemented for large PDFs
2. **Caching**: Text extraction results cached in message
3. **Async Processing**: PDF parsing happens server-side
4. **Compression**: Consider compressing before storage

### Large Document Handling

For PDFs over 50 pages:
- Use larger chunks with risk of token limits
- Implement page-specific queries
- Consider summarization preprocessing
- Add pagination support

## 🎯 Advanced Features (Future Enhancements)

Potential improvements:
- [ ] OCR for scanned PDFs
- [ ] Extract tables and charts
- [ ] Page-specific queries
- [ ] PDF annotation support
- [ ] Multi-chunk processing
- [ ] Document embeddings for RAG
- [ ] Excel/Word document support
- [ ] Batch PDF processing
- [ ] PDF generation from conversations
- [ ] Document search across history

## 📚 Resources

- [pdf-parse Documentation](https://www.npmjs.com/package/pdf-parse)
- [OpenAI GPT-4o](https://platform.openai.com/docs/models/gpt-4o)
- [LangChain Document Loaders](https://js.langchain.com/docs/modules/data_connection/document_loaders/)
- [PDF.js](https://mozilla.github.io/pdf.js/) - Alternative parser

## ✅ Summary

Your chatbot now has **comprehensive PDF analysis** capabilities:

1. **Upload & Extract**: Automatic text extraction from PDFs
2. **Question Answering**: Ask anything about document content
3. **Multi-Document**: Compare and analyze multiple PDFs
4. **Combined Modality**: Use PDFs with images in same message
5. **Context Memory**: Full conversation history with PDFs
6. **Cost Efficient**: Smart chunking and model selection

**Start analyzing documents today!** 📄✨

## 🚦 Quick Reference

### Limits
- **PDFs per message**: 3
- **Images per message**: 4
- **Chunk size**: 12,000 characters
- **Storage duration**: 24 hours

### Supported Formats
- ✅ PDF (text-based)
- ⚠️ Scanned PDFs (limited, needs OCR)
- ❌ Password-protected PDFs

### File Size
- **Recommended**: Under 5MB
- **Maximum**: Set your own limit

---

**Congratulations! Your chatbot can now read and understand PDF documents!** 🎊📚


