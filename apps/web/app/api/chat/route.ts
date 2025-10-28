import { ChatOpenAI } from '@langchain/openai';
import { GoogleGenAI } from '@google/genai';
import { UpstashRedisChatMessageHistory } from '@langchain/community/stores/message/upstash_redis';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromPDF, chunkText } from './_lib/pdf-parser';
import {
  uploadToCloudinary,
  generateCloudinaryFilename,
  validateCloudinaryConfig,
} from './_lib/cloudinary-storage';

// Environment variables required:
// OPENAI_API_KEY - Your OpenAI API key
// GOOGLE_API_KEY - Your Google AI API key (for Gemini PDF processing)
// UPSTASH_REDIS_REST_URL - Your Upstash Redis REST URL
// UPSTASH_REDIS_REST_TOKEN - Your Upstash Redis REST token
// CLOUDINARY_CLOUD_NAME - Your Cloudinary cloud name
// CLOUDINARY_API_KEY - Your Cloudinary API key
// CLOUDINARY_API_SECRET - Your Cloudinary API secret

interface ImageContent {
  type: 'image_url';
  image_url: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}

interface TextContent {
  type: 'text';
  text: string;
}

interface PDFDocument {
  name: string;
  content: string;
  base64: string;
  numPages: number;
}

/**
 * POST /api/chat
 * 
 * Handles chat messages with conversational memory using LangChain Runnables and OpenAI.
 * Supports multimodal inputs (text + images + PDFs) using GPT-4 Vision.
 * Stores conversation history in Upstash Redis.
 * 
 * Request body:
 * - message: string - The user's message
 * - sessionId: string - Unique session identifier for conversation continuity
 * - images?: string[] - Optional array of base64-encoded images or image URLs
 * - pdfs?: PDFDocument[] - Optional array of PDF documents with metadata
 */
export async function POST(request: NextRequest) {
  try {
    const { message, sessionId, images, pdfs } = await request.json();

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

    // Validate images if provided
    if (images && !Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Images must be an array' },
        { status: 400 },
      );
    }

    // Validate PDFs if provided
    if (pdfs && !Array.isArray(pdfs)) {
      return NextResponse.json(
        { error: 'PDFs must be an array' },
        { status: 400 },
      );
    }

    const hasImages = images && images.length > 0;
    const hasPDFs = pdfs && pdfs.length > 0;
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('OPENAI_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Chat service is not properly configured' },
        { status: 500 },
      );
    }

    // Validate Google API key for PDF processing
    if (hasPDFs && !process.env.GOOGLE_API_KEY) {
      console.error('GOOGLE_API_KEY is not configured but PDFs were provided');
      return NextResponse.json(
        { error: 'PDF processing service is not properly configured' },
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

    // Validate Cloudinary configuration if files are being uploaded
    if (hasImages || hasPDFs) {
      try {
        validateCloudinaryConfig();
      } catch (error) {
        console.error('Cloudinary configuration error:', error);
        return NextResponse.json(
          { error: 'File upload service is not properly configured' },
          { status: 500 },
        );
      }
    }

    const model = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
      maxTokens: 4096,
    });

    const messageHistory = new UpstashRedisChatMessageHistory({
      sessionId,
      config: {
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      },
    });

    const previousMessages = await messageHistory.getMessages();
    let imageUrls: string[] = [];
    if (hasImages) {
      try {
        imageUrls = await Promise.all(
          images.map(async (base64Image: string, index: number) => {
            const filename = generateCloudinaryFilename(
              sessionId,
              `image-${index}`,
            );

            const secureUrl = await uploadToCloudinary(
              base64Image,
              'chat-images',
              filename,
              'image',
            );

            return secureUrl;
          }),
        );
      } catch (error) {
        console.error('Error uploading images to Cloudinary:', error);
        throw new Error('Failed to upload images');
      }
    }

    // Process PDFs with Google Gemini and upload to Cloudinary
    let pdfUrls: string[] = [];
    let pdfData: { base64: string; name: string }[] = [];
    
    if (hasPDFs) {
      try {
        // Process each PDF: upload to Cloudinary and prepare for inline processing
        const pdfResults = await Promise.all(
          pdfs.map(async (pdf: any, index: number) => {
            // Upload to Cloudinary for permanent storage
            const filename = generateCloudinaryFilename(
              sessionId,
              pdf.name ?? `document-${index}`,
            );

            const cloudinaryUrl = await uploadToCloudinary(
              pdf.base64,
              'chat-pdfs',
              filename,
              'raw',
            );

            // Extract base64 data (remove data URL prefix if present)
            const base64Data = pdf.base64.replace(/^data:application\/pdf;base64,/, '');

            return {
              cloudinaryUrl,
              base64Data,
              name: pdf.name || `document-${index}`,
            };
          }),
        );

        // Store results
        pdfResults.forEach((result) => {
          pdfUrls.push(result.cloudinaryUrl);
          pdfData.push({
            base64: result.base64Data,
            name: result.name,
          });
        });
      } catch (error) {
        console.error('Error processing PDFs:', error);
        throw new Error('Failed to process PDFs');
      }
    }

    let userMessageContent: string | (TextContent | ImageContent)[];
    
    if (hasImages) {
      userMessageContent = [
        {
          type: 'text' as const,
          text: message,
        },
        ...imageUrls.map((imageUrl: string) => ({
          type: 'image_url' as const,
          image_url: {
            url: imageUrl,
            detail: 'auto' as const,
          },
        })),
      ];
    } else {
      userMessageContent = message;
    }

    const userMessage = new HumanMessage({
      content: userMessageContent,
    });

    await messageHistory.addMessage(userMessage);

    let response;
    
    // Use Gemini for PDF processing, OpenAI for everything else
    if (hasPDFs) {
      // Initialize Google GenAI client
      const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

      const systemPrompt =
        'You are a helpful AI assistant with advanced document analysis capabilities. You can analyze PDF documents and provide detailed insights. When answering questions about PDF documents, be specific and cite the relevant sections. Provide clear, concise, and accurate responses. Be friendly and professional.';

      // Build conversation history for context
      let conversationContext = '';
      if (previousMessages.length > 0) {
        conversationContext = '\n\nPrevious conversation:\n';
        previousMessages.forEach((msg: any) => {
          const role = msg._getType() === 'human' ? 'User' : 'Assistant';
          let content = msg.content;

          // Extract text content only
          if (Array.isArray(content)) {
            const textParts = content.filter((part: any) => part.type === 'text');
            content = textParts.map((part: any) => part.text).join('\n');
          } else if (typeof content === 'object') {
            content = String(content);
          }

          conversationContext += `${role}: ${content}\n`;
        });
      }

      // Build contents array with text and inline PDF data
      const contents = [
        { text: `${systemPrompt}${conversationContext}\n\nUser question: ${message}\n\nPlease analyze the following PDF document(s) and answer the user's question:` },
        ...pdfData.map((pdf) => ({
          inlineData: {
            mimeType: 'application/pdf',
            data: pdf.base64,
          },
        })),
      ];

      try {
        const geminiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: contents,
        });

        // Create a compatible response object
        response = {
          content: geminiResponse.text,
        };
      } catch (invokeError) {
        console.error('Error invoking Gemini model:', invokeError);
        throw new Error(
          `Gemini API error: ${invokeError instanceof Error ? invokeError.message : 'Unknown error'}`,
        );
      }
    } else {
      // Use OpenAI for regular chat and images
      const systemPrompt =
        'You are a helpful AI assistant with vision capabilities. You can analyze images and provide detailed insights. Provide clear, concise, and accurate responses. Be friendly and professional.';

      const messages = [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...previousMessages.map((msg: any) => {
          const role = msg._getType() === 'human' ? 'user' : 'assistant';
          let content = msg.content;

          if (typeof content === 'object' && !Array.isArray(content)) {
            content = String(content);
          }

          return { role, content };
        }),
        {
          role: 'user',
          content: userMessageContent,
        },
      ];

      try {
        response = await model.invoke(messages);
      } catch (invokeError) {
        console.error('Error invoking OpenAI model:', invokeError);
        console.error('Messages sent to model:', JSON.stringify(messages, null, 2));
        throw new Error(
          `OpenAI API error: ${invokeError instanceof Error ? invokeError.message : 'Unknown error'}`,
        );
      }
    }

    const assistantMessage =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    const aiMessage = new AIMessage(assistantMessage);
    await messageHistory.addMessage(aiMessage);
    return NextResponse.json({
      message: assistantMessage,
      sessionId: sessionId,
      hasVision: hasImages,
      hasPDFs: hasPDFs,
      pdfCount: hasPDFs ? pdfs.length : 0,
      imageUrls,
      pdfUrls
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

    const messageHistory = new UpstashRedisChatMessageHistory({
      sessionId,
      config: {
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      },
    });

    const messages = await messageHistory.getMessages();
    const conversationHistory = messages.map((msg: any) => {
      const role = msg._getType() === 'human' ? 'user' : 'assistant';

      if (Array.isArray(msg.content)) {
        return {
          role,
          content: msg.content,
          isMultimodal: true,
        };
      }

      return {
        role,
        content: msg.content as string,
        isMultimodal: false,
      };
    });

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


