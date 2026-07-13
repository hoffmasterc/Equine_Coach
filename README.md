# FormSeat

AI-assisted eventing position analysis. Upload a side-on photo and get standards-referenced
feedback on your dressage or show-jumping position.

See `docs/opportunity-analysis.md` and `docs/PRD-engineering.md` for the full background and spec.

## Setup

```
npm install
```

Create `.env.local` with:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Then run:

```
npm run dev
```

Without `ANTHROPIC_API_KEY` set, the app still runs and the UI works end-to-end, but
`/api/analyze` returns a clear "not configured" error instead of a real analysis — it never
falls back to fabricated results.

## Deploying

Set `ANTHROPIC_API_KEY` as an environment variable in your hosting provider's project settings
(Vercel: Project → Settings → Environment Variables). The key is only ever read server-side in
`app/api/analyze/route.ts` and is never sent to the browser.

## Scope of this version

Photo-only analysis for the dressage and show-jumping phases. Video input, real user accounts,
and live payment processing are intentionally out of scope for this version — see the roadmap in
`docs/PRD-engineering.md`.
