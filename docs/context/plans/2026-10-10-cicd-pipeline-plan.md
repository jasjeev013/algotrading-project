# GitHub Actions CI/CD for QuantDash

## Context

QuantDash has no CI/CD today — no `.github/workflows/`, no `.gitlab-ci.yml`. The user is used to GitLab CI and wants an equivalent GitHub Actions setup: lint/typecheck/test for both frontend and backend, then a build+publish stage, gated so pipelines only run on `develop`/`master` pushes or PRs targeting those branches (not on arbitrary feature branches). Backend already has pytest installed (unpinned) and 3 test files but zero lint/typecheck tooling; frontend has ESLint only — no tests, no typecheck, plain JS/JSX (no TypeScript). Both gaps need to be filled as part of this task so the pipeline has something real to run. CD is "mocked" in the sense that there's no real deployment target yet, but the registry publish step itself (push to GHCR) should be fully functional per the user's explicit request.

## Decisions locked in with the user
- Frontend typecheck: **skipped for now** — add a TODO comment noting a future TypeScript migration will add it. No TS tooling added now.
- Frontend tests: **minimal smoke test only** (vitest + RTL, one test asserting `App` renders).
- Backend toolchain: **ruff** (lint + format) + **mypy** (typecheck), kept permissive (`ignore_missing_imports = true`, non-strict) since the codebase has no type-hint infrastructure.
- Pipeline shape: **two workflow files** — `ci.yml` (lint/typecheck/test/build-verify) and `cd.yml` (GHCR publish), `cd.yml` triggered via `workflow_run` after `ci.yml` succeeds on `develop`/`master`.
- Trigger rule: pipelines run only on direct push to `develop`/`master`, or on PRs whose **base** branch is `develop`/`master`. Pushes to any other branch alone trigger nothing.

## Files to create
1. `.github/workflows/ci.yml`
2. `.github/workflows/cd.yml`
3. `backend/requirements-dev.txt` — pins `pytest`, `ruff`, `mypy` (pytest is currently installed ad hoc, unpinned anywhere)
4. `backend/pyproject.toml` — ruff + mypy config (backend has no pyproject.toml today)
5. `frontend/src/test/setup.js` — jest-dom/testing-library setup
6. `frontend/src/__tests__/App.test.jsx` — the one smoke test

## Files to modify
1. `frontend/package.json` — add `test` script (`vitest run`) + devDependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
2. `frontend/vite.config.js` — add a `test: {...}` block (environment: jsdom, globals: true, setupFiles) alongside the existing `plugins`/`server` config

No changes needed to `backend/Dockerfile`, `frontend/Dockerfile`, or root `docker-compose.yml` — CI only needs `docker build`, not compose.

## `backend/pyproject.toml`
```toml
[tool.ruff]
line-length = 100
target-version = "py312"
exclude = ["venv", "__pycache__"]

[tool.ruff.lint]
select = ["E", "F", "I", "W"]

[tool.mypy]
python_version = "3.12"
ignore_missing_imports = true
check_untyped_defs = false
disallow_untyped_defs = false
warn_unused_ignores = false
exclude = "venv/"
```
**Risk to flag:** with zero existing type hints, mypy may still surface real errors on the first CI run even with permissive settings (e.g. pandas/sqlalchemy dynamic typing). Run `mypy backend` locally once after adding the config, before relying on CI; if it's noisy, narrow `mypy`'s target or add targeted `# type: ignore` rather than loosening config further.

## `.github/workflows/ci.yml`
Triggers:
```yaml
on:
  push:
    branches: [develop, master]
  pull_request:
    branches: [develop, master]
```
Jobs (all `ubuntu-latest`, `actions/checkout@v4`):
- **lint-backend**: `actions/setup-python@v5` (3.12, pip cache on `backend/requirements-dev.txt`) → `pip install -r backend/requirements-dev.txt` → `ruff check backend` → `ruff format --check backend`
- **typecheck-backend**: same setup → `pip install -r backend/requirements.txt -r backend/requirements-dev.txt` → `mypy backend`
- **test-backend**: same setup/install → `pytest backend/tests`
- **lint-frontend**: `actions/setup-node@v4` (node 22, npm cache on `frontend/package-lock.json`) → `npm ci` → `npm run lint` (both `working-directory: frontend`)
- **test-frontend**: same node setup → `npm ci` → `npm run test`
- **build-backend-image**: `needs: [lint-backend, typecheck-backend, test-backend]` → `docker/setup-buildx-action@v3` → `docker/build-push-action@v6` with `context: ./backend`, `push: false` (build-only sanity check)
- **build-frontend-image**: `needs: [lint-frontend, test-frontend]` → same pattern for `./frontend`

`pull_request.branches` filters on the PR's **base** branch, which is exactly "PR targeting develop/master triggers; pushing to the source branch alone does not."

## `.github/workflows/cd.yml`
```yaml
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]

permissions:
  contents: read
  packages: write

jobs:
  publish:
    if: >
      github.event.workflow_run.conclusion == 'success' &&
      contains(fromJSON('["develop", "master"]'), github.event.workflow_run.head_branch)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.workflow_run.head_sha }}
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Build and push backend image
        uses: docker/build-push-action@v6
        with:
          context: ./backend
          push: true
          tags: |
            ghcr.io/${{ github.repository_owner }}/quantdash-backend:${{ github.event.workflow_run.head_branch }}
            ghcr.io/${{ github.repository_owner }}/quantdash-backend:${{ github.event.workflow_run.head_sha }}
      - name: Build and push frontend image
        uses: docker/build-push-action@v6
        with:
          context: ./frontend
          push: true
          tags: |
            ghcr.io/${{ github.repository_owner }}/quantdash-frontend:${{ github.event.workflow_run.head_branch }}
            ghcr.io/${{ github.repository_owner }}/quantdash-frontend:${{ github.event.workflow_run.head_sha }}
```
Add a `latest` tag only on `master` via a second conditional `docker/build-push-action` step (`if: github.event.workflow_run.head_branch == 'master'`) per image, rather than relying on inline blank-string tag interpolation, which is fragile.

**Why `workflow_run` correctly gates "after merge, not pre-merge":** a PR-triggered CI run's `head_branch` is the PR's source branch (e.g. `feature/v3`), which isn't in `[develop, master]`, so the `if:` naturally excludes it. Only push-triggered CI runs on `develop`/`master` pass the filter.

**Caveats to tell the user (manual, not implementable in the workflow):**
- Needs repo setting **Settings → Actions → General → Workflow permissions → Read and write permissions** enabled, or the push step gets a 403.
- GHCR packages pushed via `GITHUB_TOKEN` default to **private** even if the repo is public. First-time visibility change to Public must be done manually on the package's settings page.

## Verification
1. Locally run `ruff check backend`, `mypy backend`, `pytest backend/tests`, and (`npm install` then) `npm run lint` / `npm run test` in frontend before pushing, to catch config issues before CI does.
2. Push a branch with these changes, open a PR into `develop`. Confirm the "CI" workflow runs all 7 jobs in the Actions tab, and that "CD" does **not** fire (head_branch is the feature branch).
3. Merge into `develop`. Confirm a push-triggered "CI" run fires, and on completion "CD" triggers via `workflow_run` and publishes images.
4. Check the repo's Packages sidebar for `quantdash-backend` / `quantdash-frontend` with `develop` + sha tags.
5. Merge `develop` → `master`, confirm `master`, `<sha>`, and `latest` tags appear.
6. Push a commit to a throwaway branch with no PR — confirm neither workflow fires (validates the trigger restriction).
