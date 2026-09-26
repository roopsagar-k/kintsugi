import { watsonxTriage } from "./watsonx.js";
import { heuristicTriage } from "./heuristic.js";
import { logger } from "../lib/logger.js";
import type { TriageInput, TriageResult } from "./types.js";

/**
 * Main triage entry point.
 * Tries watsonx if all four env vars are set; falls back to heuristic on any failure.
 */
export async function triageFailure(input: TriageInput): Promise<TriageResult> {
  const canUseWatsonx =
    process.env["KINTSUGI_WATSONX_API_KEY"] &&
    process.env["KINTSUGI_WATSONX_PROJECT_ID"] &&
    process.env["KINTSUGI_WATSONX_URL"] &&
    process.env["KINTSUGI_WATSONX_MODEL"];
  if (canUseWatsonx) {
    try {
      const result = await watsonxTriage(input);
      logger.debug("watsonx triage success", { title: input.title.slice(0, 60) });
      return result;
    } catch (err) {
      logger.warn("watsonx triage failed, falling back to heuristic", {
        err: String(err).slice(0, 100),
      });
    }
  }
  return heuristicTriage(input);
}
