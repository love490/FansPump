import { S3Client } from "@aws-sdk/client-s3";

const region = process.env.AWS_REGION?.trim() || "us-east-1";

export const s3Client = new S3Client({
  region,
  credentials:
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        }
      : undefined,
});

export const s3BucketName = process.env.AWS_BUCKET_NAME?.trim() ?? "";

export function isS3Configured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_BUCKET_NAME &&
      process.env.AWS_REGION
  );
}
