import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/prompt";
import { ModelResponseSchema } from "@/lib/analysisSchema";
import { isRateLimited } from "@/lib/rateLimit";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB, matches client-side limit
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";

const RequestSchema = z.object({
  phase: z.enum(["dressage", "jumping"]),
  image: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png"]),
});

function base64ByteLength(base64: string): number {
  const padding = (base64.match(/=+$/) ?? [""])[0].length;
  return Math.floor((base64.length * 3) / 4) - padding;
}

async function callClaude(systemPrompt: string, phase: string, image: string, mimeType: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data: image } },
            {
              type: "text",
              text: `Analyze this ${phase} phase equestrian position photo and respond with only the JSON object described in your instructions.`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`ANTHROPIC_HTTP_${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json();
  const text = (data.content ?? []).map((block: { text?: string }) => block.text ?? "").join("");
  return text.replace(/```json|```/g, "").trim();
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { status: "error", message: "We're seeing high demand right now — please try again in a minute." },
      { status: 429 },
    );
  }

  let parsedBody;
  try {
    const json = await req.json();
    parsedBody = RequestSchema.parse(json);
  } catch {
    return NextResponse.json(
      { status: "error", message: "Invalid request — please re-upload your photo and try again." },
      { status: 400 },
    );
  }

  const { phase, image, mimeType } = parsedBody;

  if (base64ByteLength(image) > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { status: "error", message: "That image is too large. Please upload a photo under 10MB." },
      { status: 413 },
    );
  }

  const systemPrompt = buildSystemPrompt(phase);

  let lastRawText = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw =
        attempt === 0
          ? await callClaude(systemPrompt, phase, image, mimeType)
          : await callClaude(
              `${systemPrompt}\n\nIMPORTANT: your previous response did not parse as valid JSON matching the required schema. Respond ONLY with a single valid JSON object, no markdown fences, no extra commentary.`,
              phase,
              image,
              mimeType,
            );
      lastRawText = raw;

      const jsonCandidate = JSON.parse(raw);
      const result = ModelResponseSchema.parse(jsonCandidate);
      return NextResponse.json(result, { status: 200 });
    } catch (err) {
      if (err instanceof Error && err.message === "MISSING_API_KEY") {
        return NextResponse.json(
          {
            status: "error",
            message:
              "This deployment isn't configured with an AI provider key yet. Add ANTHROPIC_API_KEY in your hosting project's environment variables to enable real analysis.",
          },
          { status: 500 },
        );
      }
      // fall through to retry on the last attempt's failure
      if (attempt === 1) {
        console.error("Analysis failed after retry", err, lastRawText.slice(0, 500));
        return NextResponse.json(
          {
            status: "error",
            message: "We couldn't complete your analysis this time. Please try again in a moment.",
          },
          { status: 502 },
        );
      }
    }
  }

  return NextResponse.json(
    { status: "error", message: "Unexpected server error." },
    { status: 500 },
  );
}
