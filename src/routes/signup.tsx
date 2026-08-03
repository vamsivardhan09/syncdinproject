import { createFileRoute } from "@tanstack/react-router";
import { AuthPanel } from "@/components/auth-panel";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your SyncdIn AI Twin in 60 seconds" },
      {
        name: "description",
        content:
          "Sign up for SyncdIn and your AI Twin starts matching you with recruiters, founders, engineers and mentors in about a minute.",
      },
      { property: "og:title", content: "Join SyncdIn — the network of the future" },
      {
        property: "og:description",
        content: "Create an account and your AI Twin starts networking for you immediately.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AuthPanel mode="signup" />,
});
