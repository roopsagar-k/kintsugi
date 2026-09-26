import { z } from "zod";

// ─── ping ────────────────────────────────────────────────────────────────────
export const PingInputSchema = z.object({});
export const PingOutputSchema = z.object({
  pong: z.literal(true),
  version: z.string(),
});
export type PingOutput = z.infer<typeof PingOutputSchema>;
