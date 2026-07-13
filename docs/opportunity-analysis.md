# FormSeat — Application Opportunity Analysis

**Date:** 2026-07-13
**Prepared for:** Chelsea Hoffmaster
**Status:** Draft for review — no code changes made yet

---

## 1. Executive Summary

FormSeat's premise — instant, standards-referenced feedback on eventing rider position from a photo — addresses a real, validated pain point (cost and scarcity of qualified in-person coaching). However, the **existing prototype does not deliver on that premise today**: its AI analysis call is non-functional and silently substitutes canned demo data, and the market already contains several funded, live competitors doing versions of this same idea. This is not a blue-ocean opportunity; it's a **crowded, validated niche** where the winning move is a sharper wedge (eventing-specific, standards-cited, honest about confidence/limitations) rather than a generic "AI looks at your riding photo" pitch.

**Recommendation:** Proceed, but reposition around a defensible wedge — see Section 6 — and fix the trust-breaking defects in Section 3 before any user sees this again.

---

## 2. The Pain Point (Validated)

- Private lesson rates average **~$60–120/hour** in the US, with quality/qualified instruction (ARIA-certified, USEA-L, BHS) commanding the higher end; group lessons run $25–80/head. [Source: lessons.com, Airtasker, R.J. Classics cost surveys, 2026]
- Riders frequently train alone (early mornings, boarding barns without a resident trainer, riders who've outgrown their local coach) with no one on the ground to catch position faults in the moment.
- The self-eval problem is structural: riders **cannot see their own position** while riding — video/photo review with expert-grade feedback is the closest analog to a mirror.
- USEA estimates ~4.6M Americans involved in the equestrian industry, ~7.2M active amateur riders nationally — a large base of exactly the underserved-solo-rider persona. [USEF/USEA figures, 2025]

This pain point is real and already being addressed by multiple companies (below) — so the question isn't "does this pain exist" but "why would a rider pick FormSeat over what's already there."

---

## 3. Current App (FormSeat Prototype) — Critical Assessment

I reviewed `equestrian-analyzer (2).html`, the only artifact in this repo. Findings:

### 3.1 The analysis is not real (severity: critical, trust-breaking)
The client-side `fetch()` call to `api.anthropic.com` has **no `x-api-key` / auth header**, and browsers cannot call that API directly due to CORS regardless. Every single "analysis" request fails silently and falls back to one of exactly **two hardcoded demo objects** (one per phase). This means:
- Every dressage-phase user, regardless of their actual photo, sees the identical "shoulder slightly ahead of vertical, chair seat, uneven weight" critique.
- The overlay dots drawn on the photo are placed at **fixed illustrative coordinates** — they don't correspond to anything detected in the image.
- A user who uploads a photo of a bicycle would get the same eventing critique. There is currently zero verification that the uploaded image even contains a horse and rider.

This is the single most important thing to fix — it's not a bug in accuracy, it's a **complete absence of the core feature**, wrapped in a UI confident enough to look like it's working.

### 3.2 No grounding in actual USEA/FEI source text
The system prompt asserts standards ("hands 8–10cm above the withers," "3° forward lean is penalized") as if quoting a rulebook, but these are unsourced/paraphrased and not verified against or cited to actual USEA/FEI published materials. Even once the API call is fixed, the model's output would be *plausible-sounding* rather than *citable*. For an app whose entire value prop is "judged the way a judge sees you," ungrounded standards claims are a liability (both for trust and, if it drives real training decisions, for user safety/legal exposure).

### 3.3 No image validation / guardrails
No check that the image is a side-on profile, contains a horse+rider, has adequate lighting/resolution, or is even a photo of a person on a horse. No handling for a bad-angle photo other than a text hint before upload.

### 3.4 Fake monetization state
`localStorage`-based free counter is trivially reset (clear browser storage / private window) and provides no real gating, no accounts, no payment processing — fine for a prototype, but currently presented with real-looking pricing ($9/$19 plans, "Start 7-Day Free Trial") that implies a functioning purchase flow that doesn't exist.

### 3.5 No backend at all
Single static HTML file. No server, no persistence, no logging, no error monitoring, no rate limiting. Anyone viewing page source sees the entire prompt/rubric.

### 3.6 Accessibility / input handling gaps
No handling for HEIC on non-Safari browsers (advertised as accepted, canvas-based base64 conversion will fail silently for HEIC in most browsers), no max-size enforcement client-side despite claiming 20MB limit, no loading-state timeout/error UI (infinite spinner risk if fetch hangs).

**Bottom line:** the UI/UX shell (phase selection, upload flow, expandable results cards, disclaimer language) is genuinely well-designed and worth keeping. The analysis engine behind it needs to be built from scratch.

---

## 4. Competitive Landscape

This space is more populated than the current app's design suggests. Direct competitors found in market research (2026):

| Product | Positioning | Notes |
|---|---|---|
| **Equus AI** | "AI-powered equestrian coach" — video analysis across dressage/jumping/eventing, badge system (Verified/Certified/Elite) | Frame-by-frame video, not just photo |
| **Ridesum** | AI Seat Analytics + live trainer streaming + training diary | Broader platform (community/live lessons), free download + IAP |
| **Rider's Position (ridersposition.ai)** | Phone-sensor-based biomechanics (uses accelerometer/gyroscope, not just vision) | Different technical approach — objective motion data, not just AI-vision-on-photo |
| **Equestrian AiK** | Phone-camera technique/balance/symmetry analysis | Newer app store entrant |
| **AI Equestrian / AI Dressage (aidressage.com)** | Upload dressage test sheets + video for AI feedback | Test-sheet-specific angle |

**Implication:** "AI analyzes your riding position" is no longer a novel pitch. FormSeat's differentiators must be specific and real, not "we also do this":
- **Eventing-specific, phase-aware analysis** (dressage vs. jumping standards, not generic position scoring) — most competitors are dressage-first or generic.
- **Explicit standards citation** (USEA/FEI-referenced findings, not just a score) — a documentation/trust angle competitors don't emphasize.
- **Radical honesty about confidence/limitations** — stating when a photo angle is unsuitable for a claim, rather than always producing a confident-sounding verdict (addresses the "plausible but ungrounded" risk directly, and is a trust differentiator against apps that always output a polished score).

---

## 5. Market Sizing (Illustrative, US-only)

- **TAM:** ~7.2M active amateur riders (US) × plausible willingness-to-pay for a coaching-adjacent tool.
- **SAM:** Riders competing in or training for recognized eventing/dressage/jumping (USEA/USEF member base is a reasonable proxy, low hundreds of thousands) plus the larger pool of non-competitive English-discipline riders who care about "correct position."
- **SOM (Year 1, realistic):** A few thousand paying subscribers is a credible early target for a niche coaching-adjacent app at this stage, consistent with what a single-founder or small-team product could reach through eventing/dressage community channels (barns, USEA local groups, Instagram/TikTok riding creators) — not a mass-market consumer number.

This is a **niche, defensible SaaS opportunity**, not a venture-scale "millions of users" story on its own — that matters for how the investor PRD should frame the ask (see PRD-Investor.md).

---

## 6. Recommended Differentiation ("the wedge")

1. **Fix the core promise first:** real, per-photo AI vision analysis, server-side, with a working API key — table stakes, not a differentiator, but currently absent.
2. **Ground every claim in a real standards reference** — build (as agreed) a compiled USEA/FEI position-standards reference document, feed it to the model as grounding context, and cite it in every finding. This is the most defensible differentiator versus incumbents who don't show their work.
3. **Confidence-aware output:** if the photo isn't side-on, the horse/rider isn't fully visible, or resolution is too low for a given claim, say so per-point rather than always emitting a confident score. This is a direct fix for the "accurate and reliable" requirement in the original ask.
4. **Phase specificity** (dressage vs. jumping rubrics) — keep and strengthen this; it's already a good idea in the current prototype.
5. **Video as a v2 differentiator**, not v1 — competitors already do video; matching it later without sacrificing per-frame analysis quality is more valuable than rushing it into v1 at the cost of the photo experience.

---

## 7. Key Risks

- **Liability/safety:** position coaching advice, if wrong, could contribute to a rider adopting an unsafe habit. Disclaimer language exists in the current prototype and must be preserved/strengthened, not treated as boilerplate.
- **Vision-model accuracy on niche judgment calls** (e.g., precise degree of "hollow back") — LLM vision models can describe posture qualitatively but should not be presented as making precise angular measurements without computer-vision-based pose estimation. The PRD addresses this via confidence framing and (roadmap) pose-estimation augmentation.
- **Competitive crowding** — see Section 4; differentiation must be real, not claimed.
- **Cost per analysis** — vision API calls at scale have real per-request cost; free-tier abuse (no accounts) is a monetization risk once this goes beyond a localStorage counter.

---

## 8. Go / No-Go Recommendation

**Go**, scoped as: fix the trust-breaking defects, ship a photo-only MVP grounded in a real standards reference with honest confidence signaling, targeted at the eventing/dressage amateur-competitor niche — not a broad "we do everything" pitch. Video, accounts, and real billing are explicitly phase 2+ (see Engineering PRD roadmap).
