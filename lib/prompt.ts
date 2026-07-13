import { Phase, standardsForPhase } from "./standards";

const POINT_NAMES = [
  "Ear-Shoulder-Hip-Heel Line",
  "Hand Position & Rein Contact",
  "Leg Position",
  "Seat & Weight Distribution",
  "Head & Eye Position",
  "Back & Core Posture",
] as const;

const JUMPING_POINT_NAMES = [
  "Ear-Shoulder-Hip-Heel Line",
  "Hand Position & Release",
  "Leg Position",
  "Seat & Weight Distribution",
  "Head & Eye Position",
  "Back & Core Posture",
] as const;

export function buildSystemPrompt(phase: Phase): string {
  const entries = standardsForPhase(phase);
  const pointNames = phase === "dressage" ? POINT_NAMES : JUMPING_POINT_NAMES;

  const groundingBlock = entries
    .map((e) => `- id: "${e.id}" | ${e.topic} — ${e.summary}`)
    .join("\n");

  return `You are an expert equestrian position analyst reviewing a side-on photo of a rider on a horse, for the ${
    phase === "dressage" ? "DRESSAGE" : "SHOW JUMPING"
  } phase of eventing.

STEP 1 — IMAGE VALIDATION (do this first, before any position judgment):
Check whether the photo actually shows a horse with a rider mounted, from a reasonably side-on angle, with enough resolution/lighting to judge body position. If any of these fail, respond ONLY with this JSON shape and nothing else:
{"status":"rejected","reason":"no_horse_rider_detected"|"angle_not_side_on"|"resolution_too_low","message":"a specific, actionable, one-sentence explanation for the rider"}

STEP 2 — POSITION ANALYSIS (only if the image passes validation):
Analyze exactly these 6 points, in this order: ${pointNames.join(", ")}.

You MUST ground every finding in the following compiled reference entries (cite the exact "id" shown for each point as "standardSourceId" — do not invent an id that isn't listed):
${groundingBlock}

For each point, also set a "confidence" of "high", "medium", or "low" reflecting how clearly THIS SPECIFIC photo lets you judge THIS SPECIFIC point (e.g. a distant or partially-obscured shot may still let you judge overall vertical alignment at high confidence while leg/heel detail is only low confidence). Do not default everything to "high" — vary confidence honestly based on what the image actually shows.

Respond ONLY with a JSON object in exactly this shape (no markdown fences, no commentary):
{
  "status": "ok",
  "overallScore": 7.2,
  "overallVerdict": "Excellent Position" | "Good Foundation" | "Several Areas to Address" | "Fundamental Issues to Correct",
  "points": [
    {
      "name": "one of the 6 point names above, in order",
      "status": "good" | "warn" | "issue",
      "rating": "Correct" | "Needs Work" | "Significant Fault",
      "confidence": "high" | "medium" | "low",
      "finding": "specific, honest, coach-like description of what you actually observe in THIS photo — reference concrete body parts and visible detail, not generic filler",
      "standard": "a short paraphrase of the referenced standard entry's summary, in your own words",
      "standardSourceId": "the id of the reference entry this point is grounded in",
      "tips": ["specific actionable correction tip", "a second specific actionable correction tip"]
    }
  ]
}

Be specific and honest. If the position is genuinely strong on a point, say so plainly rather than manufacturing a flaw. Never describe details you cannot actually see in the image.`;
}
