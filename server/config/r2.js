import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.R2_ACCOUNT_ID)       console.error("[R2] Missing R2_ACCOUNT_ID");
if (!process.env.R2_ACCESS_KEY_ID)    console.error("[R2] Missing R2_ACCESS_KEY_ID");
if (!process.env.R2_SECRET_ACCESS_KEY) console.error("[R2] Missing R2_SECRET_ACCESS_KEY");
if (!process.env.R2_BUCKET_NAME)      console.error("[R2] Missing R2_BUCKET_NAME");

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export const R2_BUCKET = process.env.R2_BUCKET_NAME;

/** Presigned GET URL expiry in seconds (1 hour) */
export const SIGNED_URL_EXPIRES = 3600;
