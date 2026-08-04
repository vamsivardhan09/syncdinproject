import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "#how", label: "How it works" },
  { href: "#twin", label: "AI Twin" },
  { href: "#product", label: "Product" },
  { href: "#faq", label: "FAQ" },
];

/** Sticky, glassy marketing header. */
export function LandingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3.5">
        <Link to="/" className="focus-ring rounded-md">
          <BrandLogo />
        </Link>

        <nav aria-label="Sections" className="ml-6 hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="focus-ring rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to="/signin">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="shadow-glow">
            <Link to="/signup">Build my AI Twin</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="focus-ring ml-auto grid size-9 shrink-0 place-items-center rounded-lg border border-border sm:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border bg-background px-6 py-4 sm:hidden">
          <nav aria-label="Sections" className="grid gap-1">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="focus-ring rounded-md py-2 text-sm font-medium text-muted-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-3 grid gap-2">
            <Button asChild variant="outline">
              <Link to="/signin">Sign in</Link>
            </Button>
            <Button asChild>
              <Link to="/signup">Build my AI Twin</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

/** Marketing footer with product, company and trust columns. */
export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <BrandLogo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            SyncdIn gives every professional an AI Twin that networks on their behalf — screening,
            matching and explaining, so you only meet people who matter.
          </p>
        </div>

        <FooterCol
          title="Product"
          links={[
            { label: "How it works", href: "#how" },
            { label: "AI Twin", href: "#twin" },
            { label: "Network map", href: "#product" },
            { label: "Twin-to-Twin chat", href: "#product" },
          ]}
        />
        <FooterCol
          title="Learn"
          links={[
            { label: "Why SyncdIn", href: "#why" },
            { label: "Privacy model", href: "#trust" },
            { label: "FAQ", href: "#faq" },
          ]}
        />

        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Get started
          </p>
          <div className="mt-4 grid gap-2">
            <Button asChild size="sm">
              <Link to="/signup">Create free account</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/signin">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-border px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} SyncdIn. All rights reserved.</p>
        <p>Version 2 · Personas and metrics shown are demonstration data.</p>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {title}
      </p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              className="focus-ring rounded text-sm text-muted-foreground hover:text-foreground"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
