# Lettuce Swap — Swapping is the New Shopping

A community marketplace where swapping is the new shopping. Built with
[TanStack Start](https://tanstack.com/start), React 19, Vite 7, Tailwind CSS v4,
and [Supabase](https://supabase.com/) for the backend (database, auth, storage).

## Prerequisites

- **[Bun](https://bun.sh/) 1.1+** — package manager and runtime used by this project
  ```bash
  curl -fsSL https://bun.sh/install | bash       # macOS / Linux
  powershell -c "irm bun.sh/install.ps1 | iex"   # Windows PowerShell
  ```
- **Git** — version control
- An editor such as **[Visual Studio Code](https://code.visualstudio.com/)**
  (recommended extensions: ESLint, Prettier, Tailwind CSS IntelliSense)

## Install dependencies

```bash
bun install
```

## Environment variables

The app reads its Supabase connection from a `.env` file at the project root:

```env
# Client-side (inlined into the bundle at build time)
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-or-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-project-ref>

# Server-side (read from process.env; Bun auto-loads .env in dev)
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<your-publishable-or-anon-key>
```

Never commit `.env` to source control. Server-only secrets (e.g.
`SUPABASE_SERVICE_ROLE_KEY`, used by `src/integrations/supabase/client.server.ts`)
should be set in your deployment environment, never in the client `.env`.

### Pointing at your own Supabase project

The current `.env` points at the original hosted Supabase instance. To move to
a Supabase project you own:

1. Create a project at [supabase.com](https://supabase.com/dashboard) (or run
   `supabase start` locally with the [Supabase CLI](https://supabase.com/docs/guides/cli)).
2. Apply the schema: the full migration history is in `supabase/migrations/`.
   With the CLI linked to your project, run `supabase db push`.
3. Update `supabase/config.toml` with your `project_id` and replace the values
   in `.env` with your project's URL and keys (Dashboard → Settings → API).
4. Regenerate types if you change the schema:
   `supabase gen types typescript --linked > src/integrations/supabase/types.ts`

## Run the app locally

```bash
bun run dev
```

The dev server prints a local URL (typically `http://localhost:8080`).
Open it in your browser — hot reload is enabled.

## Other useful scripts

```bash
bun run build       # production build (Cloudflare worker + client assets)
bun run lint        # run ESLint
bun run format      # run Prettier
bun run check:theme # verify theme tokens
```

## Deployment

The production build targets a **Cloudflare module worker**
(`@cloudflare/vite-plugin` + `wrangler.jsonc`, server entry `src/server.ts`).
Deploy with [Wrangler](https://developers.cloudflare.com/workers/wrangler/):

```bash
bun run build
bunx wrangler deploy
```

Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (and `SUPABASE_SERVICE_ROLE_KEY`
if you use the admin client) as Worker secrets: `bunx wrangler secret put <NAME>`.

If you prefer a different host, remove the `cloudflare()` plugin from
`vite.config.ts` and `wrangler.jsonc`, and follow the
[TanStack Start hosting docs](https://tanstack.com/start/latest/docs/framework/react/guide/hosting)
for your target.

Before sharing links publicly, update the social/SEO metadata: the `og:image`
in `src/routes/__root.tsx` and the canonical URL in `src/routes/about.tsx`
need absolute URLs on your production domain.

## Project structure

```
src/
  routes/              # File-based routes (TanStack Router)
  components/          # Reusable UI + shadcn/ui primitives
  hooks/               # React hooks (auth, theme, etc.)
  integrations/
    supabase/          # Supabase clients (browser, server/admin) + DB types
  lib/                 # Utilities (incl. SSR error page)
  server.ts            # Worker entry — wraps SSR with a branded 500 page
  start.ts             # TanStack Start instance (middleware registration)
  styles.css           # Tailwind v4 + design tokens
public/                # Static assets (favicons, manifest, og-image)
supabase/              # Database migrations & config
```

## Troubleshooting

- **Port in use** — set `PORT=3000 bun run dev` or stop the conflicting process.
- **Blank page / 401** — check that `.env` values are correct and that your
  Supabase project is active.
- **Stale favicons** — hard-refresh the browser (`Cmd/Ctrl + Shift + R`); the
  icons are versioned with `?v=N` to invalidate caches automatically.

## Learn more

- [TanStack Start docs](https://tanstack.com/start/latest)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [Supabase docs](https://supabase.com/docs)
