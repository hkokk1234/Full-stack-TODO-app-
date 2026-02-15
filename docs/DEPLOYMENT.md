# Deployment, Secrets, and Release Strategy

## Environments

- `local`: developer machine with `.env`
- `staging`: pre-production validation environment
- `production`: customer-facing environment

Use separate Mongo databases and separate OAuth/API credentials per environment.

## Secrets Management

- Never commit real secrets in git (`.env` is local only).
- Use GitHub Environment secrets:
- `staging`: `STAGING_MONGO_URI`, `STAGING_DEPLOY_HOOK_URL`
- `production`: `PROD_MONGO_URI`, `PROD_DEPLOY_HOOK_URL`
- Rotate credentials periodically and after incidents.
- Keep `backend/.env.example` as the only tracked template.

## CI/CD Pipelines

- CI workflow: `.github/workflows/ci.yml`
- Runs: install, typecheck, tests, build.
- Staging deploy workflow: `.github/workflows/deploy-staging.yml`
- Trigger: push to `main` (or manual dispatch), runs migrations, then deploy hook.
- Production deploy workflow: `.github/workflows/deploy-production.yml`
- Trigger: git tag `v*` (or manual dispatch), runs migrations, then deploy hook.

## Release Strategy

- All features merge into `main` behind passing CI.
- Deploy to staging from `main`.
- Verify smoke tests in staging.
- Promote to production by creating a semantic version tag, e.g. `v1.4.0`.
- If rollback is needed:
- Re-deploy previous stable tag.
- Run backward-compatible migration rollback only if safe.

## DB Migration Workflow (Mongo)

- Migration config: `backend/migrate-mongo-config.js`
- Migration files: `database/migrations/*.cjs`
- Create migration:
```bash
npm --prefix backend run migrate:create -- add_new_index
```
- Apply migrations:
```bash
npm --prefix backend run migrate:up
```
- Rollback one migration:
```bash
npm --prefix backend run migrate:down
```

Rules:
- Forward migrations must be idempotent and safe for live traffic.
- Avoid destructive schema changes without a two-step rollout.
- Validate migrations in staging before production release.

## Contract Versioning

- Current API contract: `v1` (`X-API-Version: 1.0`).
- Keep backward compatibility for all `v1` consumers.
- Breaking changes require a new contract (`v2`) and parallel docs endpoint.

