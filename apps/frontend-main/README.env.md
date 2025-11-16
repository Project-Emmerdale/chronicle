**Environment variables (frontend)**

- Vite loads `.env` files depending on the mode. For local development use the values in `.env.development`. When you run `vite build` (production mode), Vite will load `.env.production`.

- Files added:

  - `.env.development` — sets `VITE_BACKEND_URL=http://localhost:3000` for local dev.
  - `.env.production` — set `VITE_BACKEND_URL` to your live backend URL before building for prod (example: `https://api.yourdomain.com`).

- Usage in code:

  - Use `import.meta.env.VITE_BACKEND_URL` (already wired in components) which Vite replaces at build time.

- Example build/deploy commands:
  - Local dev: `pnpm --filter frontend-main dev` or `npm --workspace=apps/frontend-main run dev`
  - Build: `npm --workspace=apps/frontend-main run build` (ensure `.env.production` has correct URL)
