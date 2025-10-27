import { getSupabaseServerClient } from '@kit/supabase/server-client';

/**
 * Upload a file to Supabase Storage
 * @param bucket - Storage bucket name ('chat-images' or 'chat-pdfs')
 * @param path - File path within bucket (e.g., 'sessionId/timestamp-filename')
 * @param file - File buffer or base64 string
 * @param contentType - MIME type of the file
 * @returns Public URL of the uploaded file
 */
export async function uploadToSupabase(
  bucket: string,
  path: string,
  file: Buffer | string,
  contentType: string,
): Promise<string> {
  const supabase = getSupabaseServerClient();

  // Convert base64 to buffer if needed
  let fileBuffer: Buffer;
  if (typeof file === 'string') {
    // Remove data URL prefix if present
    const base64Data = file.replace(/^data:.*;base64,/, '');
    fileBuffer = Buffer.from(base64Data, 'base64');
  } else {
    fileBuffer = file;
  }

  // Upload file
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, fileBuffer, {
      contentType,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading to Supabase Storage:', error);
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);

  return publicUrl;
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 */
export async function deleteFromSupabase(
  bucket: string,
  path: string,
): Promise<void> {
  const supabase = getSupabaseServerClient();

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    console.error('Error deleting from Supabase Storage:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Download a file from Supabase Storage
 * @param bucket - Storage bucket name
 * @param path - File path within bucket
 * @returns File buffer
 */
export async function downloadFromSupabase(
  bucket: string,
  path: string,
): Promise<Buffer> {
  const supabase = getSupabaseServerClient();

  const { data, error } = await supabase.storage.from(bucket).download(path);

  if (error) {
    console.error('Error downloading from Supabase Storage:', error);
    throw new Error(`Failed to download file: ${error.message}`);
  }

  // Convert Blob to Buffer
  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate a unique file path for storage
 * @param sessionId - Chat session ID
 * @param filename - Original filename
 * @returns Unique path string
 */
export function generateFilePath(sessionId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${sessionId}/${timestamp}-${sanitizedFilename}`;
}

/**
 * Extract path from Supabase Storage URL
 * @param url - Public URL from Supabase Storage
 * @param bucket - Storage bucket name
 * @returns File path within bucket
 */
export function extractPathFromUrl(url: string, bucket: string): string {
  const bucketPrefix = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(bucketPrefix);

  if (index === -1) {
    throw new Error('Invalid Supabase Storage URL');
  }

  return url.substring(index + bucketPrefix.length);
}

/**
 * Download file from URL (for external URLs or Supabase URLs)
 * @param url - File URL
 * @returns File buffer
 */
export async function downloadFromUrl(url: string): Promise<Buffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download file from URL: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}


