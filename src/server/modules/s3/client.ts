import { S3Client } from "@aws-sdk/client-s3";

const BUCKET_NAME = process.env.S3_BUCKET
const S3_REGION = process.env.S3_REGION || "auto"
const S3_ENDPOINT = process.env.S3_ENDPOINT

// Only create S3 client if credentials are configured
const hasS3Credentials = process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY;

export const s3Client = hasS3Credentials 
  ? new S3Client({
      region: S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      endpoint: S3_ENDPOINT,
      forcePathStyle: true, // Required for Cloudflare R2
    })
  : null;