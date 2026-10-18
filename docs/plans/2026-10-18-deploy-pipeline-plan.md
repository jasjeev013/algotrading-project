# Deploy Stage — Auto Deploy on Push to `master`

## Context

CI (`ci.yml`) and CD (`cd.yml`) already lint/typecheck/test and publish
`quantdash-backend`/`quantdash-frontend` images to GHCR on push to
`develop`/`master` (see `2026-10-10-cicd-pipeline-plan.md`). This adds the
third stage: after a `master` push publishes new images, SSH into the user's
home server over Tailscale and pull+restart the production containers,
mirroring the pattern already running for the `new-portfolio` project on the
same server (same `deployer` user, same Tailscale network).

## Decisions locked in with the user

- Deploy only on `master` (production branch), not `develop`.
- New directory on the server: `/opt/quantdash`, owned by the existing
  `deployer` user (no new OS user needed — reused from the portfolio setup).
- No reverse proxy yet: backend exposed on host port 8000, frontend on 3000
  (mapped to the container's Vite dev-server port 5173).
- Backend needs real runtime secrets (OANDA credentials) in
  `.env.production` on the server — `backend/app/config.py` raises at import
  time if `OANDA_ACCOUNT_ID`/`OANDA_API_KEY` are unset, so the container will
  crash-loop until that file is filled in.
- The four GitHub Actions secrets this reuses (`DEPLOY_SSH_KEY`,
  `TAILSCALE_SERVER_IP`, `TS_AUTHKEY`, `GHCR_PAT`) exist only in the
  `new-portfolio` repo today (repo-level, not org-level) — they need to be
  added to this repo too.

## Files created/changed in this repo

1. `.github/workflows/deploy.yml` — new. Triggered by `workflow_run` on `CD`
   completion, filtered to `branches: [master]`, runs only if `conclusion ==
   'success'`. Connects to Tailscale, then SSHes into
   `deployer@$TAILSCALE_SERVER_IP`, `cd /opt/quantdash`, logs into GHCR,
   pulls both `:latest` images, `docker compose up -d --pull always
   --remove-orphans`, prunes old images.
2. `/opt/quantdash/docker-compose.yml` on the server — the production
   compose file (drafted in-repo under `deploy/` during this work, then
   moved onto the server and removed from the repo — it's server-only
   config, not something CI touches). Pulls images from GHCR instead of
   building.
3. `/opt/quantdash/.env.production` on the server — OANDA creds + optional
   risk-rail overrides. Same story: drafted as `deploy/.env.production.example`
   in-repo, filled in and moved to the server, never committed.
4. `backend/app/database.py` — changed. SQLite path now reads
   `QUANTDASH_DB_PATH` (defaults to the old `./quantdash.db` for local dev)
   so production can point it at a volume-mounted path
   (`/app/data/quantdash.db`). Without this, every `docker compose up` on a
   freshly pulled image would wipe backtest/live-trade history, since the
   default path lives in the image's writable layer, not a volume.

## Manual, one-time setup (cannot be done from this session — no access to
the user's GitHub settings or home server)

**On the server** (as the existing `deployer` user, already in the `docker`
group from the portfolio setup):
```bash
sudo mkdir -p /opt/quantdash
sudo chown deployer:deployer /opt/quantdash
```
`/opt/quantdash/docker-compose.yml` and `/opt/quantdash/.env.production`
have already been placed on the server (done manually, outside this repo).

**GitHub repo secrets** (Settings → Secrets and variables → Actions →
Secrets) — add these four, copying the same values already used for the
`new-portfolio` repo's deploy (same server, same deployer key, same
Tailscale tailnet):

| Secret | Value |
|---|---|
| `DEPLOY_SSH_KEY` | the `deployer` user's private ed25519 key |
| `TAILSCALE_SERVER_IP` | `100.69.81.110` |
| `GHCR_PAT` | GitHub PAT with `read:packages` |
| `TS_AUTHKEY` | Tailscale auth key (regenerate if the portfolio repo's is close to its 90-day expiry — each repo can hold its own key, or the same key can be reused across repos since it's not consumed, only the ephemeral device registration is per-run) |

**GitHub repo variable** (Settings → Secrets and variables → Actions →
Variables, not Secrets — it's a public URL, nothing sensitive):

| Variable | Value |
|---|---|
| `VITE_API_BASE` | the address the browser should reach the backend at, e.g. `https://api.quantdash.jasjeev.in` or `http://100.69.81.110:8000` |

Used as a build-arg in `ci.yml`/`cd.yml` when building the frontend image
(see the `VITE_API_BASE` section below). No deploy-path variable is needed —
the workflow only references `${{ github.repository_owner }}` and a
hardcoded `/opt/quantdash`; introducing a variable for that would be
premature until there's a second server/environment to vary it for.

**GHCR package visibility**: packages pushed via the default `GITHUB_TOKEN`
in `cd.yml` are private by default even on a public repo. Either flip
`quantdash-backend`/`quantdash-frontend` to Public on their package settings
page, or confirm the `GHCR_PAT` used for `docker login` on the server has
read access to them (a classic PAT with `read:packages`, owned by the repo
owner, covers this regardless of visibility).

## `VITE_API_BASE` — making the frontend reachable from off-server

`frontend/src/api/config.ts` used to hardcode `API_BASE =
"http://localhost:8000"`. That only works when the browser and backend are on
the same machine — any other device (laptop, phone) pointed at the server's
Tailscale IP would have its browser try to reach port 8000 on *itself*, not
the server, since `localhost` is evaluated client-side.

Fixed: `API_BASE` now reads `import.meta.env.VITE_API_BASE`, falling back to
`http://localhost:8000` for local dev (`frontend/src/api/config.ts`,
`frontend/src/vite-env.d.ts` for the type).

## Production Dockerfiles split from dev

Both services originally had one `Dockerfile` each, used for both local dev
(with bind-mounted source + hot reload) and the image CI/CD publishes to
GHCR for production. Split into two per service:

- `backend/Dockerfile.dev` / `frontend/Dockerfile.dev` — the original
  content, unchanged. Referenced explicitly by the root `docker-compose.yml`
  (local dev only).
- `backend/Dockerfile` / `frontend/Dockerfile` — new, production-only. This
  is what `ci.yml`/`cd.yml` build by default (context with no explicit
  `file:` override resolves to `Dockerfile`), so no workflow trigger/path
  changes were needed there beyond the frontend build-arg below.

**Backend production Dockerfile**: same base image, but runs as a non-root
`appuser` instead of root, and pre-creates `/app/data` (chowned to
`appuser`) as the mount point for the `QUANTDASH_DB_PATH` volume — Docker
copies a mount point's ownership/permissions from the image into a
freshly-created named volume on first use, so this keeps the volume writable
without running the container as root.

**Frontend production Dockerfile**: multi-stage — `npm ci && npm run build`
in a `node:22-alpine` builder stage, then the static `dist/` output is
served by `nginx:1.27-alpine` (config: `frontend/nginx.conf`, a plain
`try_files ... /index.html` — the app has no client-side router, it's a
single page with tab-state, so this is just a safety fallback, not real SPA
routing). This is a meaningful behavior change from the dev-server setup:

- The container now listens on port **80** internally, not 5173 — the
  server's `docker-compose.yml` port mapping is `3000:80`.
- `VITE_API_BASE` can no longer be a server-side runtime env var, because a
  static bundle has no process running at container start to read
  `process.env` from (unlike the Vite dev server). It's now a Docker
  **build arg**, baked into the JS bundle at image-build time. `cd.yml` (and
  `ci.yml`, for its build-only sanity check) pass it via
  `build-args: VITE_API_BASE=${{ vars.VITE_API_BASE }}` — see the repository
  variable above. Consequence: **changing the API base now requires a push
  to `master` to rebuild the image** — editing `.env.production` on the
  server alone no longer does anything for this value.

## Verification

1. Push a commit to `master` (or merge `develop` → `master`), confirm `CI` →
   `CD` → `Deploy` fire in sequence in the Actions tab.
2. On the server: `docker ps | grep quantdash` shows both containers
   `Up`, and `docker compose logs backend` shows no crash from missing OANDA
   env vars.
3. Push to `develop` only — confirm `CI` and `CD` run but `Deploy` does not
   (branch filter excludes it).
4. Restart/redeploy once with existing backtest history present — confirm
   `quantdash.db` survives (volume persistence) rather than resetting.
5. Open the deployed frontend from a non-server device (e.g. phone on the
   Tailscale network) and confirm API calls succeed — checks that
   `VITE_API_BASE` was actually baked in (inspect the built JS in dev tools,
   or just watch the Network tab for requests going to the right host).
6. Confirm `docker exec quantdash-backend whoami` prints `appuser`, not
   `root`, and that the backend can still write to `/app/data` (a backtest
   run completes without a permissions error in the logs).
