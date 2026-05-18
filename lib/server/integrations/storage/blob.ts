import "server-only";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";

const client = new S3Client({
  endpoint: env.STORAGE_ENDPOINT,
  region: env.STORAGE_REGION,
  forcePathStyle: env.STORAGE_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
  },
});

const PUT_TTL = 300;
const GET_TTL = 60;

export async function presignPut(
  key: string,
  contentType: string,
): Promise<string> {
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: PUT_TTL },
  );
}

export async function presignGet(key: string): Promise<string> {
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }),
    { expiresIn: GET_TTL },
  );
}

export async function deleteObject(key: string): Promise<void> {
  await client.send(
    new DeleteObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }),
  );
}

export async function putText(key: string, text: string, contentType = "text/markdown"): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: env.STORAGE_BUCKET,
      Key: key,
      Body: text,
      ContentType: contentType,
    }),
  );
}

export async function downloadObject(key: string): Promise<string> {
  const res = await client.send(new GetObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }));
  return res.Body!.transformToString();
}
