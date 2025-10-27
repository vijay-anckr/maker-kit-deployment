import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
// Required environment variables:
// CLOUDINARY_CLOUD_NAME
// CLOUDINARY_API_KEY
// CLOUDINARY_API_SECRET

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a file to Cloudinary
 * @param file - File buffer or base64 string
 * @param folder - Cloudinary folder (e.g., 'chat-images' or 'chat-pdfs')
 * @param filename - Filename (without extension)
 * @param resourceType - 'image' or 'raw' (for PDFs)
 * @returns Secure URL of the uploaded file
 */
export async function uploadToCloudinary(
  file: Buffer | string,
  folder: string,
  filename: string,
  resourceType: 'image' | 'raw' = 'image',
): Promise<string> {
  try {
    // Convert to base64 data URI if Buffer
    let fileData: string;
    if (Buffer.isBuffer(file)) {
      const base64 = file.toString('base64');
      const mimeType =
        resourceType === 'image' ? 'image/jpeg' : 'application/pdf';
      fileData = `data:${mimeType};base64,${base64}`;
    } else {
      fileData = file;
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fileData, {
      folder: folder,
      public_id: filename,
      resource_type: resourceType,
      type: 'upload',
      // For PDFs, use raw resource type
      ...(resourceType === 'raw' && {
        format: 'pdf',
      }),
    });

    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw new Error(
      `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Generate a unique filename for Cloudinary
 * @param sessionId - Chat session ID
 * @param originalFilename - Original filename
 * @returns Unique filename string
 */
export function generateCloudinaryFilename(
  sessionId: string,
  originalFilename: string,
): string {
  const timestamp = Date.now();
  const sanitizedFilename = originalFilename
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${sessionId}_${timestamp}_${sanitizedFilename}`;
}

/**
 * Validate Cloudinary configuration
 * @throws Error if configuration is missing
 */
export function validateCloudinaryConfig(): void {
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      'Cloudinary configuration missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.',
    );
  }
}
