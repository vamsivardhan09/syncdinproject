import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LandingFooter, LandingNav } from "@/components/landing/landing-chrome";
import {
  FaqSection,
  FinalCta,
  Hero,
  HowSection,
  PeopleSection,
  ProductSection,
  StatsBand,
  TestimonialSection,
  TrustSection,
  TwinSection,
  WhySection,
} from "@/components/landing/landing-sections";

const title = "SyncdIn — Your personal AI networking agent";
const description =
  "SyncdIn gives every professional an AI Twin that meets other Twins first, then introduces you to the recruiters, founders, mentors and collaborators worth your time — with the reason attached.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        
        <Hero />
        <StatsBand />
        <WhySection />
        <HowSection />
        <TwinSection />
        <ProductSection />
        <PeopleSection />
        <TrustSection />
        <TestimonialSection />
        <FaqSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
