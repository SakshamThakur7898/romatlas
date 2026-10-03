# Deployment notes (auth)

The refresh token is an httpOnly cookie set with `SameSite=Lax`. That works when the browser talks to the API
on the **same site** as the page (local dev uses the Vite proxy for this). If the frontend (e.g. Vercel) and API
(e.g. Render) are on different sites, either:
1. Route `/api/*` through the frontend host (Vercel rewrites) so the cookie stays first-party (recommended), or
2. Serve both under one parent domain, or
3. Change the cookie to `SameSite=None; Secure` in `utils/jwt.ts` and tighten CORS and CSRF protection.

Set distinct `JWT_SECRET` and `JWT_REFRESH_SECRET` (>= 32 chars) in production; the API refuses to start otherwise.
