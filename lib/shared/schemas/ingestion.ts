import { z } from "zod";

export const ADZUNA_COUNTRIES = ["GB", "US", "AU", "CA"] as const;

export const ingestRunSchema = z
  .object({
    source: z.enum(["adzuna", "reed"]),
    country: z.enum(["GB", "US", "AU", "CA"]),
  })
  .refine((d) => d.source !== "reed" || d.country === "GB", {
    message: "Reed only supports GB",
    path: ["country"],
  });
export type IngestRunInput = z.infer<typeof ingestRunSchema>;
