import { put } from '@vercel/blob';

/**
 * Upload a file to Vercel Blob storage
 * @param file - File buffer or base64 string
 * @param filename - Name for the uploaded file
 * @param folder - Optional folder path (e.g., 'products', 'documents')
 * @returns Public URL of the uploaded file
 */
export async function uploadToBlob(
  file: Buffer | string,
  filename: string,
  folder?: string
): Promise<string> {
  try {
    // Convert base64 to Buffer if needed
    let fileBuffer: Buffer;
    if (typeof file === 'string') {
      // Remove data URL prefix if present (e.g., "data:image/png;base64,")
      const base64Data = file.includes(',') ? file.split(',')[1] : file;
      fileBuffer = Buffer.from(base64Data, 'base64');
    } else {
      fileBuffer = file;
    }

    // Create path with folder if provided
    const path = folder ? `${folder}/${filename}` : filename;

    // Upload to Vercel Blob
    const blob = await put(path, fileBuffer, {
      access: 'public',
    });

    return blob.url;
  } catch (error) {
    console.error('Blob upload error:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upload multiple image files to Vercel Blob
 * @param images - Array of base64 image strings
 * @param folder - Folder to store images in
 * @returns Array of public URLs
 */
export async function uploadImages(
  images: string[],
  folder: string = 'products'
): Promise<string[]> {
  const uploadPromises = images.map((image, index) => {
    const timestamp = Date.now();
    const filename = `${timestamp}-${index}.jpg`;
    return uploadToBlob(image, filename, folder);
  });

  return Promise.all(uploadPromises);
}

/**
 * Upload a document (PDF, DOC, etc.) to Vercel Blob
 * @param document - Base64 document string
 * @param filename - Original filename
 * @param folder - Folder to store document in
 * @returns Public URL of the uploaded document
 */
export async function uploadDocument(
  document: string,
  filename: string,
  folder: string = 'documents'
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueFilename = `${timestamp}-${sanitizedFilename}`;
  
  return uploadToBlob(document, uniqueFilename, folder);
}
