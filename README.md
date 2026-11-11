# IKODI

IKODI is a scholarship and sponsorship management system. The repository currently
contains a production-oriented API foundation and a responsive public landing page.

## Local development

1. Copy `backend/.env.example` to `backend/.env` and set `DATABASE_URL`.
2. Install dependencies from the repository root with `npm install`.
3. Run `npm run setup` to validate the environment, generate the Prisma client, apply migrations, seed sample scholarships, and provision development test users.
4. Start the API with `npm run dev`.

The API listens on `http://localhost:4000`. Liveness is available at
`/api/health/live`, readiness at `/api/health/ready`, and public scholarships at
`/api/v1/scholarships`.

## Development test accounts

When `NODE_ENV=development`, `npm run setup` provisions the test accounts listed
in `scripts/create-system-users.ts`. These fixed credentials are for local testing
only and must be removed before production deployment. Set `ADMIN_EMAIL` and
`ADMIN_PASSWORD` in `backend/.env` when you want to provision a specific
administrator with `npm run create-admin`.

## Production status

This is not yet a complete business system: authentication, role-based workflows,
document processing, payments, notifications, reporting, and operational deployment
integrations still need to be implemented and tested against the requirements in
`docs/SRS.md`. The foundation includes strict environment validation, secure HTTP
headers, CORS allow-listing, rate limiting, structured logging, graceful shutdown,
database health checks, and a normalized initial data model.
