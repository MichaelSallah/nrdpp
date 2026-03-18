# NRDPP – National RFQ Digital Procurement Platform

Ghana's PPA-aligned digital procurement platform for public institutions and suppliers.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ (or Docker)
- npm 9+

### Option A – Docker (Recommended)

```bash
docker-compose up -d
```

This starts PostgreSQL, the API (port 5000), and the Web app (port 3000).

Run migrations and seed:
```bash
docker exec nrdpp_api npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma
docker exec nrdpp_api node -e "require('./dist/seed')"
```

### Option B – Local Development

**1. Set up environment:**
```bash
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env with your PostgreSQL credentials
```

**2. Install dependencies:**
```bash
npm install
```

**3. Set up database:**
```bash
# Run migrations
node_modules/.bin/prisma migrate dev --schema=packages/db/prisma/schema.prisma --name init

# Seed database
node_modules/.bin/ts-node packages/db/prisma/seed.ts
```

**4. Start development servers:**
```bash
# Terminal 1 – API (port 5000)
npm run dev --workspace=apps/api

# Terminal 2 – Web (port 3000)
npm run dev --workspace=apps/web
```

## Default Login Credentials (seed data)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@nrdpp.gov.gh | Admin@1234! |
| Buyer | procurement@mofep.gov.gh | Buyer@1234! |
| Supplier | info@techghana.com | Supplier@1234! |

## Platform URLs

- Web App: http://localhost:3000
- API: http://localhost:5000
- API Health: http://localhost:5000/api/health
- Prisma Studio: `npm run db:studio`

## Architecture

```
nrdpp/
├── apps/
│   ├── api/          # Express + TypeScript API (port 5000)
│   └── web/          # Next.js 15 frontend (port 3000)
├── packages/
│   └── db/           # Prisma schema + migrations
└── docker-compose.yml
```

## Core Modules

| Module | Description |
|--------|-------------|
| Auth | JWT-based login/register with refresh tokens |
| Supplier Registration | Multi-step onboarding + document upload |
| Compliance Engine | Document expiry tracking + risk scoring |
| RFQ Creation | 4-step wizard with PPA validation |
| Supplier Matching | Category-based auto-invitation + alerts |
| Quotation Submission | Structured pricing, locked post-deadline |
| RFQ Chatroom | Real-time Socket.io clarification room |
| Evaluation & Award | Scoring matrix + committee workflow |
| Audit Trail | Immutable lifecycle logs |
| Notifications | In-app + real-time (Socket.io) + email |

## API Reference

Base URL: `http://localhost:5000/api`

### Auth
- `POST /auth/register` – Create account
- `POST /auth/login` – Login
- `POST /auth/refresh` – Refresh token
- `GET /auth/me` – Current user

### RFQs
- `GET /rfqs` – Marketplace listing
- `POST /rfqs` – Create RFQ (BUYER)
- `GET /rfqs/:id` – RFQ detail
- `POST /rfqs/:id/publish` – Publish RFQ
- `POST /rfqs/:id/quotations` – Submit quotation (SUPPLIER)
- `GET /rfqs/:id/quotations` – List quotations
- `POST /rfqs/:id/chat` – Send chat message
- `POST /rfqs/:id/evaluations` – Score supplier
- `POST /rfqs/:id/award` – Award RFQ

### Suppliers
- `POST /suppliers/register` – Register profile
- `GET /suppliers/:id` – Get profile
- `PATCH /suppliers/:id/status` – Update status (ADMIN)
- `GET /suppliers/:id/compliance` – Compliance check

### Reports
- `GET /reports/dashboard-stats` – Dashboard stats
- `GET /reports/rfq-summary` – RFQ summary
- `GET /reports/pricing-analytics` – Pricing data

### Audit
- `GET /audit/rfq/:id` – RFQ audit trail
- `GET /audit` – All logs (ADMIN)

## Legal Alignment

Built to comply with:
- Ghana Public Procurement Act (Act 663)
- Section 42 – Request for Quotations
- Section 43 – RFQ Procedures
- PPA Procurement Manual guidelines
