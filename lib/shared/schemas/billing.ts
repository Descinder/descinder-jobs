import { z } from "zod";

// Format-only UUID (project convention: Zod 4 strict .uuid() rejects some
// RFC-4122-valid test ids; see 2b-iii).
const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

export const subscribeSchema = z.object({
  plan: z.enum(["seeker_monthly", "company_monthly"]),
});
export type SubscribeInput = z.infer<typeof subscribeSchema>;

export const jobPostPaySchema = z.object({ jobId: uuid });
export type JobPostPayInput = z.infer<typeof jobPostPaySchema>;
