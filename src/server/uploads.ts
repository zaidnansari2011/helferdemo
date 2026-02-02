/**
 * Vercel Blob Upload Integration Module
 * 
 * This module provides blob storage upload functionality that works seamlessly
 * with the existing S3/R2 implementation. It automatically detects if running
 * on Vercel and uses Vercel Blob, otherwise falls back to S3/demo mode.
 */

import { uploadImages, uploadDocument } from './modules/blob/upload';

/**
 * Determine if we're running on Vercel
 */
function isVercelEnvironment(): boolean {
  return process.env.VERCEL === '1' || process.env.VERCEL_ENV !== undefined;
}

/**
 * Check if Vercel Blob is configured
 */
function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Upload product images - uses Vercel Blob on Vercel, S3/demo mode otherwise
 * @param images - Array of base64 image strings
 * @returns Array of public URLs
 */
export async function uploadProductImages(images: string[]): Promise<string[]> {
  const isDemoMode = process.env.DEMO_MODE === 'true';
  
  // In demo mode, return the base64 strings directly
  if (isDemoMode) {
    return images;
  }
  
  // On Vercel with Blob configured, use Vercel Blob
  if (isVercelEnvironment() && isBlobConfigured()) {
    return await uploadImages(images, 'products');
  }
  
  // Otherwise, return as-is and let S3 handler deal with it
  return images;
}

/**
 * Upload a single document - uses Vercel Blob on Vercel, S3/demo mode otherwise
 * @param document - Base64 document string
 * @param filename - Original filename
 * @param folder - Folder to store in (default: 'documents')
 * @returns Public URL of the document
 */
export async function uploadSellerDocument(
  document: string,
  filename: string,
  folder: string = 'documents'
): Promise<string> {
  const isDemoMode = process.env.DEMO_MODE === 'true';
  
  // In demo mode, return the base64 string directly
  if (isDemoMode) {
    return document;
  }
  
  // On Vercel with Blob configured, use Vercel Blob
  if (isVercelEnvironment() && isBlobConfigured()) {
    return await uploadDocument(document, filename, folder);
  }
  
  // Otherwise, return as-is and let S3 handler deal with it
  return document;
}

/**
 * Upload brand logo - uses Vercel Blob on Vercel, S3/demo mode otherwise
 * @param logo - Base64 logo string
 * @param filename - Original filename
 * @returns Public URL of the logo
 */
export async function uploadBrandLogo(logo: string, filename: string): Promise<string> {
  return uploadSellerDocument(logo, filename, 'logos');
}
