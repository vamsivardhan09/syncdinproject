import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy entry point — the split sign-in / sign-up surfaces replaced it. */
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/signin", replace: true });
  },
});
