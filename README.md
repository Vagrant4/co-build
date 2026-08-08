# Co-Build MVP

Singapore-first marketplace MVP for short-term fabrication workspace rental.

## Status

Phase 1 established managed identity, centralized authorization, participant-scoped conversations, and protected admin exports. Phase 2A adds private direct uploads, validated upload metadata, permission-checked downloads, reviewed PostgreSQL migrations, operations reporting, and a basic health/logging baseline. The pilot automation pass adds fail-closed pre-render route gates, in-app and email notification outboxes, message moderation, audit checkpoints, guarded retention, bank reconciliation, restore-drill tooling, public approved-listing photos, and desktop/mobile browser gates.

Co-Build is suitable for demos and continued invite-only pilot preparation. It is **not production-ready**, and real uploads remain disabled by default.

Before any real pilot account or file:

- Connect a Vercel Blob store created with **Private** access.
- Configure Clerk for the pilot environment.
- Use a separate Neon production branch, pooled runtime URL, direct migration URL, backups, and a completed restore drill.
- Configure persistent error alerts and an external uptime check for `/api/health`.
- Configure and test the malware-scanner adapter. Temporary unscanned pilot uploads require an explicit risk flag; production uploads fail closed without the scanner.

## Run Locally

```powershell
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run db:push
$env:APP_MODE="demo"
npm.cmd run db:seed
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

SQLite lives at `prisma/dev.db` and is ignored. Seeded upload rows are `LEGACY_DEMO` metadata only; no pilot or production route serves local paths.

## Release Commands

```powershell
npm.cmd test
npm.cmd exec prisma validate -- --schema prisma/schema.prisma
npm.cmd exec prisma validate -- --schema prisma/postgres/schema.prisma
npm.cmd run build
npm.cmd run ops:report -- --json
npm.cmd run test:e2e
npm.cmd audit --audit-level=high
```

Production migrations are a controlled release step:

```powershell
npm.cmd run prisma:generate:prod
npm.cmd run db:deploy:prod
npm.cmd run vercel-build
```

`vercel-build` does not mutate the database and does not seed demo data.

## Documentation

- [Phase 2A implementation report](docs/PHASE_2A_IMPLEMENTATION_REPORT.md)
- [Private storage setup](docs/PRIVATE_STORAGE_SETUP.md)
- [Production operations checklist](docs/PRODUCTION_OPERATIONS_CHECKLIST.md)
- [Phase 1 implementation report](docs/PHASE_1_IMPLEMENTATION_REPORT.md)
- [Clerk pilot setup](docs/CLERK_SETUP.md)
- [Deployment guide](DEPLOYMENT.md)
- [Rollback and recovery](docs/ROLLBACK_RECOVERY.md)
- [Production readiness checklist](docs/PRODUCTION_READINESS_CHECKLIST.md)
- [Pilot readiness automation report](docs/PILOT_READINESS_AUTOMATION_REPORT.md)
- [Pilot operations runbook](docs/PILOT_OPERATIONS_RUNBOOK.md)
- [External configuration checklist](docs/EXTERNAL_CONFIGURATION_CHECKLIST.md)
