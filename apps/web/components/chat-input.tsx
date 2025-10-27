'use client';

import { useState, FormEvent, KeyboardEvent, useRef } from 'react';
import { Button } from '@kit/ui/button';
import { Textarea } from '@kit/ui/textarea';
import { Send, Loader2, ImagePlus, FileText, X } from 'lucide-react';
import { cn } from '@kit/ui/utils';

interface PDFDocument {
  name: string;
  content: string;
  base64: string;
  numPages: number;
}

interface ChatInputProps {
  onSendMessage: (
    message: string,
    images?: string[],
    pdfs?: PDFDocument[],
  ) => Promise<void>;
  isLoading: boolean;
  disabled?: boolean;
}

export function ChatInput({
  onSendMessage,
  isLoading,
  disabled = false,
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [pdfs, setPdfs] = useState<PDFDocument[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Limit to 4 images
    const newImages = files.slice(0, 4 - images.length);

    // Convert to base64
    const base64Images = await Promise.all(
      newImages.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }),
      ),
    );

    setImages([...images, ...base64Images]);
    
    // Reset file input
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handlePDFSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    // Limit to 3 PDFs
    const newPDFs = files.slice(0, 3 - pdfs.length);

    // Convert PDFs to base64
    const pdfDocs = await Promise.all(
      newPDFs.map(
        (file) =>
          new Promise<PDFDocument>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result as string;
              resolve({
                name: file.name,
                content: '', // Will be extracted on server
                base64: base64,
                numPages: 0, // Will be determined on server
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }),
      ),
    );

    setPdfs([...pdfs, ...pdfDocs]);
    
    // Reset file input
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const removePDF = (index: number) => {
    setPdfs(pdfs.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (
      (!message.trim() && images.length === 0 && pdfs.length === 0) ||
      isLoading ||
      disabled
    ) {
      return;
    }

    const messageToSend =
      message.trim() ||
      (pdfs.length > 0
        ? 'What can you tell me about these documents?'
        : 'What can you tell me about these images?');
    const imagesToSend = [...images];
    const pdfsToSend = [...pdfs];
    
    setMessage('');
    setImages([]);
    setPdfs([]);

    try {
      await onSendMessage(
        messageToSend,
        imagesToSend.length > 0 ? imagesToSend : undefined,
        pdfsToSend.length > 0 ? pdfsToSend : undefined,
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      // Restore message, images, and PDFs on error
      setMessage(messageToSend);
      setImages(imagesToSend);
      setPdfs(pdfsToSend);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {/* File Previews */}
      {(images.length > 0 || pdfs.length > 0) && (
        <div className="flex gap-2 flex-wrap">
          {/* Image Previews */}
          {images.map((image, index) => (
            <div key={`img-${index}`} className="relative group">
              <img
                src={image}
                alt={`Upload ${index + 1}`}
                className="h-20 w-20 object-cover rounded-lg border"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* PDF Previews */}
          {pdfs.map((pdf, index) => (
            <div
              key={`pdf-${index}`}
              className="relative group h-20 w-32 border rounded-lg bg-muted flex flex-col items-center justify-center p-2"
            >
              <FileText className="h-8 w-8 text-muted-foreground" />
              <span className="text-xs mt-1 truncate w-full text-center">
                {pdf.name}
              </span>
              <button
                type="button"
                onClick={() => removePDF(index)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2">
        <div className="flex-1 space-y-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
            className="min-h-[60px] max-h-[200px] resize-none"
            disabled={isLoading || disabled}
          />
        </div>
        
        <div className="flex flex-col gap-2">
          {/* Image Upload Button */}
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => imageInputRef.current?.click()}
            disabled={isLoading || disabled || images.length >= 4}
            title="Add images (max 4)"
            className="h-[60px] w-[60px] shrink-0"
          >
            <ImagePlus className="h-5 w-5" />
          </Button>

          {/* PDF Upload Button */}
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => pdfInputRef.current?.click()}
            disabled={isLoading || disabled || pdfs.length >= 3}
            title="Add PDFs (max 3)"
            className="h-[60px] w-[60px] shrink-0"
          >
            <FileText className="h-5 w-5" />
          </Button>
          
          {/* Send Button */}
          <Button
            type="submit"
            size="icon"
            disabled={
              (!message.trim() && images.length === 0 && pdfs.length === 0) ||
              isLoading ||
              disabled
            }
            className={cn('h-[60px] w-[60px] shrink-0')}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageSelect}
        className="hidden"
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        multiple
        onChange={handlePDFSelect}
        className="hidden"
      />
    </form>
  );
}

