import pdf from 'pdf-parse/lib/pdf-parse.js';

/**
 * Extract text content from a PDF file buffer
 * @param buffer - PDF file as Buffer
 * @returns Extracted text content and metadata
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<{
  text: string;
  numPages: number;
  info: any;
}> {
  try {
    const data = await pdf(buffer);

    return {
      text: data.text,
      numPages: data.numpages,
      info: data.info,
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

/**
 * Convert base64 PDF to Buffer
 * @param base64String - Base64 encoded PDF (with or without data URL prefix)
 * @returns Buffer containing PDF data
 */
export function base64ToBuffer(base64String: string): Buffer {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:application\/pdf;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

/**
 * Chunk large PDF text into smaller segments
 * Useful for very large PDFs to avoid token limits
 * @param text - Full PDF text
 * @param maxChunkSize - Maximum characters per chunk
 * @returns Array of text chunks
 */
export function chunkText(text: string, maxChunkSize: number = 15000): string[] {
  if (text.length <= maxChunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  // Split by paragraphs to maintain context
  const paragraphs = text.split('\n\n');

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length <= maxChunkSize) {
      currentChunk += paragraph + '\n\n';
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = paragraph + '\n\n';
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}


