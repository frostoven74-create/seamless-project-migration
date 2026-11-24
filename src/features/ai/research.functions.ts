import { createServerFn } from "@tanstack/react-start";
import { researchInput } from "./brief";
import { clientKey, rateLimit, runResearch } from "./research.server";

/** Public server function: validated input, per-visitor rate limit, no user data stored server-side. */
export const runRippleResearch = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => researchInput.parse(data))
  .handler(async ({ data }) => {
    const rl = rateLimit(clientKey());
    if (!rl.ok) {
      return { ok: false as const, error: `Research limit reached for now. Try again in about ${rl.retryInMin} min.`, latencyMs: 0, model: "", promptVersion: "" };
    }
    return runResearch(data);
  });
