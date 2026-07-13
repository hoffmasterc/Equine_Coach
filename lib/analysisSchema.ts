import { z } from "zod";

/**
 * Strict schema for the model's analysis response. Anything that doesn't
 * parse against this is treated as a failed analysis and retried/errored —
 * never silently replaced with placeholder data.
 */
export const AnalysisPointSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["good", "warn", "issue"]),
  rating: z.enum(["Correct", "Needs Work", "Significant Fault"]),
  confidence: z.enum(["high", "medium", "low"]),
  finding: z.string().min(1),
  standard: z.string().min(1),
  standardSourceId: z.string().min(1),
  tips: z.array(z.string().min(1)).min(1),
});

export const AnalysisOkSchema = z.object({
  status: z.literal("ok"),
  overallScore: z.number().min(0).max(10),
  overallVerdict: z.enum([
    "Excellent Position",
    "Good Foundation",
    "Several Areas to Address",
    "Fundamental Issues to Correct",
  ]),
  points: z.array(AnalysisPointSchema).length(6),
});

export const AnalysisRejectedSchema = z.object({
  status: z.literal("rejected"),
  reason: z.enum([
    "no_horse_rider_detected",
    "angle_not_side_on",
    "resolution_too_low",
  ]),
  message: z.string().min(1),
});

export const ModelResponseSchema = z.union([
  AnalysisOkSchema,
  AnalysisRejectedSchema,
]);

export type AnalysisPoint = z.infer<typeof AnalysisPointSchema>;
export type AnalysisOk = z.infer<typeof AnalysisOkSchema>;
export type AnalysisRejected = z.infer<typeof AnalysisRejectedSchema>;
export type ModelResponse = z.infer<typeof ModelResponseSchema>;
