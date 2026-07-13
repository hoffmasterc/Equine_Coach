/**
 * Minimal in-memory per-instance rate limiter for the MVP. This resets on
 * cold start and is not shared across serverless instances — a known,
 * documented limitation (see Engineering PRD, Section 8) acceptable for
 * bounding runaway cost at this stage, not a substitute for real
 * account-based limits once billing lands in Phase 3.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;

const hits = new Map<string, number[]>();

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const timestamps = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    hits.set(key, timestamps);
    return true;
  }
  timestamps.push(now);
  hits.set(key, timestamps);
  return false;
}
