import { z } from "zod";
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
export const aiCvGenerateSchema = z.object({
  jobId: uuid,
  baseText: z.string().trim().min(50).max(20000),
});
export type AiCvGenerateInput = z.infer<typeof aiCvGenerateSchema>;
