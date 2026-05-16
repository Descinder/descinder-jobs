import { z } from "zod";

const MAX = 5 * 1024 * 1024; // 5 MB (matches cv_files.size_bytes DB check)
const ALLOWED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

export const cvUploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  mime_type: z.enum(ALLOWED_MIME),
  size_bytes: z.number().int().positive().max(MAX),
});
export type CvUploadRequest = z.infer<typeof cvUploadRequestSchema>;
export { ALLOWED_MIME, MAX as CV_MAX_BYTES };
