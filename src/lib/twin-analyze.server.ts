/**
 * Server-only analysis helpers for Twin source material.
 * Kept out of `*.functions.ts` so the server-fn split cannot strip them.
 */
import { z } from "zod";

export const AnalysisSchema = z.object({
  headline: z.string().default(""),
  summary: z.string().default(""),
  discovered: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  goals: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  strengthPct: z.number().min(0).max(100).default(60),
});

export type TwinAnalysis = z.infer<typeof AnalysisSchema>;

const SYSTEM = `You analyse professional material for SyncdIn, a network where an AI Twin represents a person.
Extract only facts present in the material — never invent employers, dates or numbers.
Reply with STRICT JSON only, no markdown fences, in this shape:
{"headline":string,"summary":string,"discovered":string[],"skills":string[],"goals":string[],"interests":string[],"strengthPct":number}
- "headline": short professional headline, max 12 words, no company invention.
- "discovered": 4-8 short chips like "14 Skills", "React", "3 Companies", "Case Studies".
- "skills": 5-12 concrete capabilities, each 1-4 words.
- "goals": 2-5 things this person is trying to do next, only if stated or clearly implied.
- "interests": 2-6 topics/domains they care about.
- "summary": 1-2 sentences, second person ("You build..."), on what the Twin now understands.
- "strengthPct": 0-100 how much usable networking signal this material provides.
Return empty arrays rather than guesses when the material does not support a field.`;

export async function callGateway(content: unknown[]): Promise<TwinAnalysis> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("AI is rate limited — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
  if (!res.ok) throw new Error(`Analysis failed (${res.status})`);

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = json.choices?.[0]?.message?.content?.trim() ?? "";
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned an unreadable analysis");
  }
  return AnalysisSchema.parse(parsed);
}

/** Fetches readable text from a public URL. Returns "" when unreachable. */
export async function readableText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SyncdInBot/1.0)" },
    });
    if (!res.ok) return "";
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 20000);
  } catch {
    return "";
  }
}

export function resumeContent(input: {
  filename: string;
  mimeType: string;
  fileData: string;
}): unknown[] {
  const base64 = input.fileData.split(",")[1] ?? "";
  if (!base64) throw new Error("The uploaded file appears to be empty");

  if (input.mimeType.includes("pdf")) {
    return [
      { type: "text", text: "Analyse this résumé for the person's AI Twin." },
      { type: "file", file: { filename: input.filename, file_data: input.fileData } },
    ];
  }
  return [
    {
      type: "text",
      text: `Analyse this résumé for the person's AI Twin.\n\n${Buffer.from(base64, "base64")
        .toString("utf8")
        .slice(0, 24000)}`,
    },
  ];
}
