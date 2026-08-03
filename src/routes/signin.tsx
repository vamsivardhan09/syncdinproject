import { createFileRoute } from "@tanstack/react-router";
import { AuthPanel } from "@/components/auth-panel";

export const Route = createFileRoute("/signin")({
  head: () => ({
    meta: [
      { title: "Sign in to SyncdIn — see what your Twin found" },
      {
        name: "description",
        content:
          "Sign in to SyncdIn with Google, a magic link or email and password to review the matches your AI Twin surfaced.",
      },
      { property: "og:title", content: "Sign in to SyncdIn" },
      {
        property: "og:description",
        content: "Your AI Twin has been networking. Sign in to see who it found.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AuthPanel mode="signin" />,
});
