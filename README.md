# SyncdIn

AI-powered networking platform that builds a personal "Twin" to discover, qualify, and start conversations with relevant professionals on your behalf.

Built using **TanStack Start** (React full-stack framework), **TypeScript**, **Supabase**, **PostgreSQL** and **Framer Motion**. The architecture is compatible with a modern React full-stack workflow while focusing on rapid product iteration.

**Live URL:** https://syncdin.lovable.app

---

## Features

- **AI Twin training** — connect LinkedIn, GitHub, portfolio links, or upload a résumé to build a multi-dimensional profile.
- **Intelligent match feed** — surfaced candidates with relevance scoring and mutual-interest signals.
- **Twin-to-Twin chat** — AI personas negotiate intros and next steps, with full user override.
- **Real-time messaging** — WhatsApp-style conversation threads with profile context.
- **Network map** — animated world map showing matches and connection signals by location.
- **Progressive onboarding** — 60-second activation flow with skill discovery rewards.

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | TanStack Start (React 19, full-stack SSR/SSG) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Database | Supabase / PostgreSQL |
| Auth | Supabase Auth (Google OAuth, magic link, email/password, LinkedIn OIDC) |
| AI | Lovable AI Gateway (Gemini) |
| Animations | Framer Motion |
| Package manager | Bun |

---

## Prerequisites

- [Bun](https://bun.sh/) installed (v1.2+)
- A Supabase project (Lovable Cloud or BYO)
- LinkedIn OAuth app credentials (optional, for LinkedIn sign-in)
- Lovable API key (for AI Twin features)

---

## Environment variables

Create a `.env` file in the project root with the following variables. Values are available from your Lovable project settings / Supabase dashboard.

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Lovable AI Gateway
LOVABLE_API_KEY=

# LinkedIn OIDC (optional)
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
```

> Never commit `.env` or any secret values to GitHub.

---

## Local setup

1. **Clone the repository**

   ```sh
   git clone <repository-url>
   cd syncdin
   ```

2. **Install dependencies**

   ```sh
   bun install
   ```

3. **Run database migrations**

   Apply the migrations in `supabase/migrations/` to your Supabase project.

4. **Start the development server**

   ```sh
   bun run dev
   ```

   The app will be available at `http://localhost:8080`.

---

## Available scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start the Vite dev server |
| `bun run build` | Build for production |
| `bun run start` | Start the production server |
| `bun run lint` | Run ESLint |
| `bun run format` | Run Prettier |
| `bun run typecheck` | Run TypeScript checks |

---

## Project structure

```text
src/
  components/       # Reusable UI components
  integrations/     # Supabase and Lovable clients
  lib/              # Business logic, demo data, server helpers
  routes/           # TanStack Start file routes
  styles.css        # Tailwind v4 theme tokens
supabase/
  migrations/       # Database schema and seed data
public/             # Static assets
```

---

## Deployment

This project is designed to deploy through Lovable. Connect the project to GitHub via **Plus (+) → GitHub → Connect project** in the Lovable editor, then publish from the top-right publish button.

For self-hosting, build the output with `bun run build` and deploy the generated assets to any platform that supports Vite / Node / edge runtimes.

---

## License

This codebase is owned by the project author. All rights reserved.
