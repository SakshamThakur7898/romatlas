# Deployment notes (auth)

The refresh token is an httpOnly cookie set with `SameSite=Lax`. That works when the browser talks to the API
on the **same site** as the page (local dev uses the Vite proxy for this). If the frontend (e.g. Vercel) and API
(e.g. Render) are on different sites, either:
1. Route `/api/*` through the frontend host (Vercel rewrites) so the cookie stays first-party (recommended), or
2. Serve both under one parent domain, or
3. Change the cookie to `SameSite=None; Secure` in `utils/jwt.ts` and tighten CORS and CSRF protection.

Set distinct `JWT_SECRET` and `JWT_REFRESH_SECRET` (>= 32 chars) in production; the API refuses to start otherwise.

## Render: two separate services (what is deployed today)
`*.onrender.com` is a public suffix, so `romatlas-frontend.onrender.com` and the API are **different sites**.
Set on the API service: `COOKIE_SAME_SITE=none`, `CLIENT_ORIGIN=https://<frontend>.onrender.com` (no trailing slash),
`NODE_ENV=production`, `MONGODB_URI`, and two distinct 32+ char JWT secrets. `/auth/refresh` and `/auth/logout`
reject requests whose Origin is not `CLIENT_ORIGIN`. Browsers that block third-party cookies can still break
session restore; the robust fix is a Static Site rewrite of `/api/*` to the API (then drop `VITE_API_URL`
and use `COOKIE_SAME_SITE=lax`).

Never put credentials in source files or defaults. Production refuses to start without `MONGODB_URI`.

## AI assistant and submissions
- `/assistant` calls NVIDIA NIM through the API. Set `NIM_API_KEY` (and optionally `NIM_MODEL`) on the API service,
  otherwise the assistant answers "not configured". It requires sign-in and is limited to 8 questions/minute per user.
- Any signed-in user can submit suggestions (20/hour, max 20 pending). Nothing is published until a moderator approves
  it in Admin -> Submissions; approved ROM builds are saved as COMMUNITY_REPORTED, never VERIFIED.
