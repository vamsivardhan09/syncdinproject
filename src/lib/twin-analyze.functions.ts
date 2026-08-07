import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ResumeInput = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  /** Full data URL: data:<mime>;base64,<...> */
  fileData: z.string().min(32),
});

const PortfolioInput = z.object({ url: z.string().url() });

const AnalysisSchema = z.object({
  headline: z.string().default(""),
  summary: z.string().default(""),
  discovered: z.array(z.string()).default([]),
  skills: z.array(z.string()).default([]),
  strengthPct: z.number().min(0).max(100).default(60),
});

export type TwinAnalysis = z.infer<typeof AnalysisSchema>;

const SYSTEM = `You analyse professional material for SyncdIn, a network where an AI Twin represents a person.
Extract only facts present in the material — never invent employers, dates or numbers.
Reply with STRICT JSON only, no markdown fences, in this shape:
{"headline":string,"summary":string,"discovered":string[],"skills":string[],"strengthPct":number}
- "discovered": 4-8 short chips like "14 Skills", "React", "3 Companies", "Case Studies".
- "summary": 1-2 sentences on what the Twin now understands.
- "strengthPct": 0-100 how much usable networking signal this material provides.`;

async function callGateway(content: unknown[]): Promise<TwinAnalysis> {
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
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned an unreadable analysis");
  }
  return AnalysisSchema.parse(parsed);
}

export const analyzeResume = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ResumeInput.parse(input))
  .handler(async ({ data }) => {
    const base64 = data.fileData.split(",")[1] ?? "";
    if (!base64) throw new Error("The uploaded file appears to be empty");

    const isPdf = data.mimeType.includes("pdf");
    const content = isPdf
      ? [
          { type: "text", text: "Analyse this résumé for the person's AI Twin." },
          {
            type: "file",
            file: { filename: data.filename, file_data: data.fileData },
          },
        ]
      : [
          {
            type: "text",
            text: `Analyse this résumé for the person's AI Twin.\n\n${Buffer.from(
              base64,
              "base64",
            )
              .toString("utf8")
              .slice(0, 24000)}`,
          },
        ];

    return callGateway(content);
  });

export const analyzePortfolio = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PortfolioInput.parse(input))
  .handler(async ({ data }) => {
    let pageText = "";
    try {
      const res = await fetch(data.url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SyncdInBot/1.0)" },
      });
      if (res.ok) {
        const html = await res.text();
        pageText = html
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 20000);
      }
    } catch {
      /* unreachable site — analyse from the URL alone */
    }

    return callGateway([
      {
        type: "text",
        text: `Analyse this portfolio for the person's AI Twin.\nURL: ${data.url}\n\nPage content:\n${
          pageText || "(page could not be fetched — infer only from the URL and say so in summary)"
        }`,
      },
    ]);
  });
