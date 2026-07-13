# FormSeat — Engineering PRD (v1 / MVP)

**Status:** Draft for review — no build work has started
**Audience:** Engineers, product, QA
**Companion docs:** `opportunity-analysis.md`, `PRD-investor.md`

---

## 1. Product Summary

FormSeat is a web app that gives amateur eventing riders instant, standards-referenced feedback on their riding position from a single side-on photo, scoped separately for the dressage phase and the show-jumping phase.

**v1 scope:** photo-only, single-user, no accounts, no real payments, real AI vision analysis grounded in a compiled USEA/FEI standards reference, deployed live on Vercel or Netlify.

**Explicitly out of scope for v1:** video upload/analysis, user accounts, real payment processing, mobile apps, computer-vision pose estimation (skeleton tracking) — see Section 10 (Roadmap) for when these arrive.

---

## 2. Goals & Non-Goals

### Goals
- G1: Every analysis reflects the actual uploaded photo — no silent fallback to canned data.
- G2: Every finding cites a real, compiled standards reference, not just model-generated prose.
- G3: The app tells the user when it's *not confident* (bad angle, low resolution, horse/rider not fully visible) rather than always producing a polished score.
- G4: The app is safely deployable publicly — no exposed API keys, no unbounded cost exposure, no PII retention without purpose.
- G5: A working, user-testable prototype live at a public URL.

### Non-Goals (v1)
- Real user accounts / auth
- Real Stripe billing
- Video upload or frame extraction
- Computer-vision joint/angle measurement (pose estimation models)
- Progress tracking / history across sessions
- Multi-language support

---

## 3. Personas

- **P1 — Solo amateur eventer:** trains without a resident coach at their barn, competes BN–Prelim, wants a "second pair of eyes" between lessons.
- **P2 — Working student / young rider:** budget-constrained, wants frequent low-cost feedback vs. paying for every lesson.
- **P3 — Coach (secondary, future):** may want to send this to students as homework between sessions (not designed for in v1, but rubric/output should not preclude it).

---

## 4. Functional Requirements

### 4.1 Phase selection
- User selects **Dressage** or **Show Jumping** before upload (unchanged from current prototype UX).
- Phase selection determines which rubric/prompt/standards-reference subset is used.

### 4.2 Photo upload
- Accept JPG/PNG only for v1. **Remove HEIC from advertised accepted formats** — current prototype claims HEIC support but the client-side canvas conversion does not reliably handle it cross-browser; either implement real server-side HEIC transcoding or drop the claim. Recommendation: drop for v1, revisit if user demand appears.
- Enforce max file size (10MB recommended — 20MB claim in current prototype is not validated anywhere) client-side before upload, with a clear error message, and again server-side as a hard limit.
- Drag-and-drop and tap-to-browse both retained from current UX.

### 4.3 Pre-analysis image validation (NEW — does not exist today)
Before sending to the vision model for the full rubric analysis, run a fast, cheap pre-check (single lightweight vision call or heuristic) that answers:
- Is a horse and rider both visible in the frame?
- Is the shot reasonably side-on (not head-on, not aerial)?
- Is resolution/lighting sufficient to make position judgments?

If any check fails: show a specific, actionable rejection message (e.g., "We couldn't clearly see a horse and rider in this photo — try a side-on shot with both fully in frame") **instead of** running the full analysis. This directly fixes the "garbage in, confident-looking garbage out" failure mode identified in the opportunity analysis.

### 4.4 Analysis engine (core fix)
- Server-side endpoint (`POST /api/analyze`) receives the image (and phase), calls Claude with vision input **from the server**, using a securely stored API key (never shipped to the client).
- The prompt is grounded with excerpts from the compiled standards reference document (Section 7) relevant to the selected phase — injected as context, not just asserted in the system prompt from model memory.
- Response is validated against a strict JSON schema (Section 6) before being trusted; on schema-validation failure, retry once with a corrective follow-up instruction; on repeated failure, return a clear "analysis failed, please try again" error — **never silently substitute demo data as if it were a real result** (this is the single most important behavioral change from the current prototype).
- Each of the 6 alignment points includes a **confidence** field (`high` / `medium` / `low`) driven by prompt instructions to self-assess based on image clarity/angle for that specific point (e.g., hand contact quality may be low-confidence from a distant shot even if the vertical alignment line is clearly visible).

### 4.5 Results display
- Retain current UX pattern: overall score/verdict header, expandable per-point cards (status dot, rating chip, finding, standard reference, correction tips).
- **Add confidence indicator** per point (e.g., a small "Low confidence — photo angle limited this assessment" note) — new requirement per G3.
- **Remove or fundamentally rework the illustrative overlay dots** (`drawOverlay()` in current code draws fixed decorative coordinates unrelated to the actual photo). For v1, either: (a) remove the overlay entirely and rely on the text findings, or (b) have the model return approximate normalized bounding-box coordinates per point and render those — only if the model can do so reliably; this must be validated against real outputs before shipping, not assumed. Recommendation: ship v1 without the overlay (removes a misleading visual), revisit with real coordinate grounding in Phase 2.
- Disclaimer language from current prototype is good — keep and slightly strengthen ("training aid, not a substitute for in-person coaching or veterinary/safety assessment").

### 4.6 Freemium gating (simulated, per approved scope)
- Keep the current localStorage-based free-analysis counter (3 free) and paywall UI as a **simulated** limit — no real accounts or billing in v1.
- Update copy so it doesn't overclaim ("Start 7-Day Free Trial" button should not be wired to a live checkout in v1 — either disable/hide until Phase 3, or link it to a waitlist form instead of implying a working purchase flow).

### 4.7 Error & edge-case handling
- Network/API failure → visible error state with retry action, not a spinner that hangs or a silent fallback.
- Oversized file → rejected client-side with message before upload attempt.
- Non-image file → rejected client-side.
- API rate limit / cost-control trip (Section 8) → friendly "high demand, try again shortly" message.

---

## 5. System Architecture

```
Browser (static frontend: HTML/CSS/JS or lightweight React)
   │
   │  POST /api/analyze  { image (base64 or multipart), phase }
   ▼
Serverless function (Vercel/Netlify function)
   │
   ├─ Pre-validation check (horse/rider present? side-on? resolution ok?)
   ├─ Build grounded prompt (phase rubric + relevant standards excerpts)
   ├─ Call Claude API (server-side, API key from env var)
   ├─ Validate JSON response against schema; retry once on failure
   └─ Return structured result to browser
   │
   ▼
Browser renders results (no direct browser→Anthropic calls, ever)
```

**Key architectural rule carried over from the defect analysis:** the browser must never hold or send the Anthropic API key, and must never call `api.anthropic.com` directly. All model calls are server-side only.

**Recommended stack:** Next.js (App Router) with API routes, deployed to Vercel (first-class Next.js support, simplest path to serverless functions + env vars) or a static frontend + Netlify Functions if Netlify is preferred — either is acceptable per the approved "either" scope; Vercel is the lower-friction default given Next.js API routes map directly to Vercel's model.

---

## 6. API Contract

### `POST /api/analyze`

**Request:**
```json
{
  "phase": "dressage" | "jumping",
  "image": "<base64-encoded JPEG/PNG>",
  "mimeType": "image/jpeg" | "image/png"
}
```

**Response (success):**
```json
{
  "status": "ok",
  "overallScore": 6.8,
  "overallVerdict": "Good Foundation",
  "points": [
    {
      "name": "Ear-Shoulder-Hip-Heel Line",
      "status": "good" | "warn" | "issue",
      "rating": "Correct" | "Needs Work" | "Significant Fault",
      "confidence": "high" | "medium" | "low",
      "finding": "string",
      "standard": "string — must reference the compiled standards doc",
      "standardSourceId": "string — id into the reference doc for traceability",
      "tips": ["string", "string"]
    }
  ]
}
```

**Response (image rejected at pre-validation):**
```json
{ "status": "rejected", "reason": "no_horse_rider_detected" | "angle_not_side_on" | "resolution_too_low", "message": "human-readable string" }
```

**Response (analysis failure after retry):**
```json
{ "status": "error", "message": "human-readable string" }
```

---

## 7. Grounding / Sources of Truth

Per the approved scope, since no proprietary rulebook PDFs are being supplied:

1. Compile a **`standards-reference.json`** (or `.md`) document containing structured, plainly-worded summaries of publicly available USEA/FEI position-related standards for both phases, each entry with a stable `id`, phase, topic, and a **clearly labeled provenance note** ("compiled summary, not a verbatim rulebook quote — for training guidance only").
2. This document is injected into the model prompt as grounding context (not just described in the system prompt from memory), and each finding's `standardSourceId` must map to an entry in it — this makes the app's claims traceable and auditable, and is the core differentiator identified in the opportunity analysis.
3. **Important honesty constraint:** because this is a compiled/paraphrased reference rather than licensed official rulebook text, the app's copy must say "based on publicly available USEA/FEI position guidance" rather than implying official endorsement or verbatim quotation — avoids both accuracy and legal/trademark risk (FormSeat already correctly disclaims "not affiliated with USEA or FEI" in the footer; keep this).
4. If/when the user obtains licensed rulebook access or official partnership, this reference doc is the seam where that gets swapped in — no other architecture change needed.

---

## 8. Non-Functional Requirements

- **Security:** API key stored only as a server-side environment variable (Vercel/Netlify project settings), never in client bundle or repo. No secrets committed to git.
- **Cost control:** basic per-IP or per-session rate limiting on `/api/analyze` (even simple in-memory/edge-config counter for v1) to prevent runaway API spend from the removal of any real auth gate.
- **Privacy:** uploaded photos are sent to the model provider for inference and should **not** be persisted server-side beyond the request lifecycle in v1 (no database yet) — state this plainly in the privacy/disclaimer copy.
- **Performance:** target end-to-end analysis response under ~10s; show clear loading state (already present) with a timeout fallback (e.g., 30s) that surfaces an error rather than spinning forever.
- **Accessibility:** maintain keyboard-navigable upload control, sufficient color contrast (current dark/gold palette should be checked against WCAG AA for text), alt text on images.
- **Browser support:** modern evergreen browsers; graceful message for unsupported file types instead of silent failure.

---

## 9. Success Metrics (for this MVP)

- % of analyses that return a real, schema-valid, photo-specific result (target: 100% — i.e., zero silent fallbacks, by construction).
- % of uploads rejected at pre-validation with an actionable message (quality signal, not a failure metric).
- Qualitative: does a real rider, shown two different photos of themselves, get two visibly different, specific findings? (Manual QA gate before calling this "done" — see Section 11.)

---

## 10. Roadmap (Post-MVP)

| Phase | Scope |
|---|---|
| **Phase 2** | Video input: user uploads a short clip; server extracts 1–3 key frames (e.g., detected apex-of-fence or a sampled mid-clip frame for dressage) and runs the same photo pipeline per frame — explicitly *not* full frame-by-frame motion analysis yet, to avoid diluting per-frame accuracy. |
| **Phase 3** | Real accounts + Stripe billing, replacing the simulated localStorage paywall; persistent history/progress tracking across sessions. |
| **Phase 4** | True motion analysis: computer-vision pose estimation (e.g., joint/skeleton tracking) fused with the LLM's qualitative read, enabling actual angle measurements rather than qualitative description — this is what would let the app make precise degree-based claims safely. |
| **Phase 5** | Coach-facing features (assign homework, review student uploads), licensed/official standards-body partnership if pursued. |

---

## 11. QA / Acceptance Criteria for v1 Launch

1. Two different real photos of the same phase produce two visibly different sets of findings (not the same demo text).
2. A non-horse image is rejected at pre-validation with a clear message, not analyzed.
3. No network request from the browser ever contains the Anthropic API key or targets `api.anthropic.com` directly (verify via browser devtools network tab).
4. Every returned finding includes a `standardSourceId` that resolves to a real entry in the standards reference doc.
5. Killing the network mid-analysis shows a visible error state, not an infinite spinner.
6. App is reachable at a public HTTPS URL on Vercel or Netlify with no build errors.

---

## 12. Open Questions (for product owner, not blocking MVP build)

- Should the pre-validation "no horse/rider detected" check use a separate cheap model call, or be folded into the main analysis call's first step? (Recommend: folded into one call initially for cost/latency; split out only if false-positive rate is high in testing.)
- What's the acceptable false-rejection rate for pre-validation before it's judged too aggressive/annoying?
- Long-term: is there appetite to pursue an actual licensing conversation with USEA/FEI, or does the "publicly compiled reference" framing stay permanent?
