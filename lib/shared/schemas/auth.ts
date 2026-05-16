import { z } from "zod";
export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120),
  role: z.enum(["job_seeker", "employer"]),
  acquisition_source: z.enum(["google","social_linkedin","social_twitter","social_other","referral","press_blog","event_university","paid_ad","other"]).optional(),
  marketing_consent: z.boolean(),
  accepted_terms: z.literal(true),
});
export type SignupInput = z.infer<typeof signupSchema>;
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const magicLinkSchema = z.object({ email: z.string().email() });
export const forgotSchema = z.object({ email: z.string().email() });
export const resetSchema = z.object({ new_password: z.string().min(8).max(200) });
