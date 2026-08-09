import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callGateway, readableText, resumeContent } from "@/lib/twin-analyze.server";
import type { TwinAnalysis } from "@/lib/twin-analyze.server";

export type { TwinAnalysis };

export const analyzeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        filename: z.string().min(1),
        mimeType: z.string().min(1),
        /** Full data URL: data:<mime>;base64,<...> */
        fileData: z.string().min(32),
      })
      .parse(input),
  )
  .handler(async ({ data }) => callGateway(resumeContent(data)));

export const analyzePortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ url: z.string().url() }).parse(input))
  .handler(async ({ data }) => {
    const pageText = await readableText(data.url);
    return callGateway([
      {
        type: "text",
        text: `Analyse this portfolio or profile page for the person's AI Twin.\nURL: ${data.url}\n\nPage content:\n${
          pageText || "(page could not be fetched — infer only from the URL and say so in summary)"
        }`,
      },
    ]);
  });

/** Onboarding fallback: the user describes their current work in their own words. */
export const analyzeText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ text: z.string().trim().min(40).max(4000) }).parse(input),
  )
  .handler(async ({ data }) =>
    callGateway([
      {
        type: "text",
        text: `This is how the person describes their current work, in their own words. Build their AI Twin from it.\n\n${data.text}`,
      },
    ]),
  );
