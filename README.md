# ROMAtlas

Source-linked index of Android devices, custom ROMs, recoveries, kernels and guides (MERN + TypeScript + AI assistant).

## Status
Phase 3 (auth) and the API layer are complete and hardened: refresh-token rotation with reuse detection, strict input schemas, audit logging, deterministic AI device resolution. Phase 4 frontend: home (real counts), device search, device detail with 8 tabs, ROM list/detail, updates feed, Cmd+K search, light/dark theme. Accounts (sign in/register, session restore via refresh cookie), follow, bookmark, report, and a notification bell for followed devices/ROMs are built. Guide pages and the admin dashboard are not built yet.

Phase 2 complete: Mongoose models, indexes, dev seed (`npm run seed -w apps/api`, `--force` to replace). Phase 1 complete: monorepo, API foundation (Express 5, Zod env, Helmet, CORS, rate limit, request IDs, standard error format), React/Vite/Tailwind shell with light/dark theme, CI.

## Data
Real data comes from importers, see `docs/DATA_SOURCES.md`. After the API can reach MongoDB: `npm run sync -w apps/api -- all`.

## Run locally
```bash
npm install
docker compose up -d mongo
cp .env.example apps/api/.env
npm run dev:api    # http://localhost:4000/api/health
npm run dev:web    # http://localhost:5173
npm run lint && npm run typecheck && npm test && npm run build
```
Commit the generated `package-lock.json` (CI uses `npm ci`).
