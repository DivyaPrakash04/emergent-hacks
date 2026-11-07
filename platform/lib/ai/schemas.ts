/**
 * Zod schemas for Claude's structured output. Server-only (used by lib/ai/claude.ts).
 * Every field Claude might not know is nullable, so "not stated" never has to be guessed.
 */
import { z } from "zod/v4";

export const FACILITY_ENUM = ["furnished", "kitchen", "laundry", "gym", "privateBath", "ac", "parking"] as const;

const range = z.object({ ideal: z.number().nullable(), limit: z.number().nullable() });

export const IntakeOutput = z.object({
  destination: z.enum(["work", "campus"]).nullable(),
  price: range,
  commute: range,
  dates: z.object({
    start: z.string().nullable(),
    end: z.string().nullable(),
    maxUncoveredDays: z.number().nullable(),
  }),
  facilities: z.array(z.object({ key: z.enum(FACILITY_ENUM), level: z.enum(["must", "important", "nice", "none"]) })),
  questions: z.array(z.string()),
});
export type IntakeOutputT = z.infer<typeof IntakeOutput>;

export const CheckOutput = z.object({
  signals: z.array(
    z.object({
      id: z.enum(["payment_pressure", "cannot_view", "urgency", "off_platform_contact"]),
      evidence: z.string(),
    }),
  ),
});
export type CheckOutputT = z.infer<typeof CheckOutput>;
