# FormSync — Bank-Grade Digital Form Digitisation Platform

A comprehensive digital form management platform built for banking operations, featuring dynamic form rendering, configurable multi-tier approval workflows (powered by Flowable BPMN), digital signatures, CBS/DMS integration stubs, and role-based access control.

## Architecture

```
┌─────────────────────────────┐     ┌──────────────────────────────────┐
│   React Native (Expo)       │     │   Spring Boot 3 Backend          │
│   ─────────────────────     │────▶│   ──────────────────             │
│   • Dynamic Form Renderer   │ API │   • JWT Authentication           │
│   • Drag-and-Drop Builder   │     │   • Flowable BPMN Workflows      │
│   • Signature Capture       │     │   • Configurable Approval Rules   │
│   • Approval Dashboard      │     │   • CBS Stub Connector            │
│   • Admin Panel             │     │   • DMS Stub Connector            │
│   • Audit Viewer            │     │   • Flyway Migrations             │
└─────────────────────────────┘     └──────────┬───────────────────────┘
                                               │
                                    ┌──────────▼───────────────────────┐
                                    │   PostgreSQL 16                   │
                                    │   • JSONB for flexible schemas    │
                                    │   • Workflow rules engine         │
                                    │   • Audit trail                   │
                                    └──────────────────────────────────┘
```

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | React Native (Expo SDK 51), TypeScript         |
| Backend   | Spring Boot 3.2, Java 17, Flowable 7.0.1       |
| Database  | PostgreSQL 16 with JSONB                        |
| Auth      | JWT (access + refresh tokens)                   |
| Workflow  | Flowable BPMN embedded engine                   |
| Deploy    | Docker Compose                                  |

## Journey Types (10)

1. **Cash Deposit** — OTC cash deposit with denomination breakdown
2. **Cash Withdrawal** — OTC withdrawal with purpose & authorisation
3. **Funds Transfer** — Internal/RTGS/EFT/SWIFT transfers
4. **Demand Draft** — Bankers cheque / DD issuance
5. **Account Servicing** — Address, nominee, KYC updates
6. **Fixed Deposit** — Term deposit placement & maturity instructions
7. **Loan Disbursement** — Drawdown with pre-disbursement checklist
8. **Cheque Book Request** — Cheque book ordering
9. **Account Opening** — Full KYC new account form
10. **Instrument Clearing** — Cheque/DD clearing processing

## User Roles

| Role            | Capabilities                                        |
|-----------------|-----------------------------------------------------|
| MAKER (Teller)  | Create, submit, view own forms                      |
| CHECKER         | Approve Tier 1, view branch queue                   |
| BRANCH_MANAGER  | Approve Tier 1-3, branch config, delegation         |
| OPS_ADMIN       | Cross-branch dashboard, SLA monitoring, escalation  |
| SYSTEM_ADMIN    | Form builder, workflow config, user/role management  |
| AUDITOR         | Audit log viewer, compliance reports                |

## Prerequisites

- **Java 17** (JDK)
- **Maven 3.8+**
- **Node.js 18+**
- **Docker & Docker Compose**

## Quick Start (Docker)

```bash
# 1. Clone the repository
git clone https://github.com/umeshadhikari/formsync.git
cd formsync

# 2. Copy environment file
cp .env.example .env

# 3. Build and run everything
docker-compose up --build

# 4. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080
# Database: localhost:5432 (formsync/formsync123)
```

## Manual Build

### Backend
```bash
cd backend
mvn clean package -DskipTests
java -jar target/*.jar --spring.profiles.active=dev
```

### Frontend (Web)
```bash
cd frontend
npm install
npx expo start --web
```

### Frontend (Mobile)
```bash
cd frontend
npm install
npx expo start
# Scan QR code with Expo Go app
```

## Demo Credentials

All demo users have the password: `demo123`

| Username     | Role            | Branch  |
|-------------|-----------------|---------|
| teller1     | MAKER           | NRB001  |
| teller2     | MAKER           | NRB001  |
| supervisor1 | CHECKER         | NRB001  |
| manager1    | BRANCH_MANAGER  | NRB001  |
| admin1      | SYSTEM_ADMIN    | HQ001   |
| auditor1    | AUDITOR         | HQ001   |
| opsadmin1   | OPS_ADMIN       | HQ001   |

## Demo Walkthrough

1. **Login as teller1** → Dashboard shows 10 journey tiles
2. **Select Cash Deposit** → Fill the dynamic form (account, amount, depositor info, denomination)
3. **Submit** → Customer review screen with dual signature capture (customer + teller)
4. **Login as supervisor1** → See pending approval in queue
5. **Review and Approve** → Form progresses through workflow
6. **CBS Stub** returns mock T24 reference on final approval
7. **DMS Stub** archives the form
8. **Login as admin1** → Access Form Builder, Workflow Config, Admin Panel
9. **Login as auditor1** → View complete audit trail

## Approval Workflow Rules

Approval routing is fully configurable via database rules (no hard-coding):

| Journey        | Condition           | Tiers | Approvers                        |
|---------------|---------------------|-------|----------------------------------|
| Cash Deposit  | ≤ 500K              | 0     | Auto-approved                    |
| Cash Deposit  | > 500K              | 1     | Checker                          |
| Cash Deposit  | > 1M                | 2     | Checker → Branch Manager         |
| Cash Withdrawal | > 1M              | 3     | Checker → BM → Ops Admin        |
| Funds Transfer | > 1M (RTGS)        | 2     | Checker → Branch Manager         |
| Loan Disbursement | All              | 2     | Checker → Branch Manager         |

Rules are evaluated by priority (highest priority matching rule wins).

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` — Login with username/password
- `POST /api/v1/auth/refresh` — Refresh access token

### Forms
- `POST /api/v1/forms/submit` — Submit a new form
- `POST /api/v1/forms/draft` — Save as draft
- `GET /api/v1/forms/{id}` — Get form by ID
- `GET /api/v1/forms/my` — Get current user's forms
- `GET /api/v1/forms/branch` — Get branch forms

### Workflows
- `POST /api/v1/workflow/approve/{formId}` — Approve/Reject/Return
- `GET /api/v1/workflow/pending` — Get pending approval queue
- `GET /api/v1/workflow/rules` — List workflow rules
- `POST /api/v1/workflow/rules` — Create workflow rule

### Templates
- `GET /api/v1/templates` — List all templates
- `GET /api/v1/templates/journey/{type}` — Get templates by journey
- `POST /api/v1/templates` — Create template (admin only)

### Admin
- `GET /api/v1/admin/users` — List users
- `GET /api/v1/admin/roles` — List role mappings
- `GET /api/v1/admin/themes` — List themes
- `GET /api/v1/admin/dashboard/stats` — Dashboard statistics

### Audit
- `GET /api/v1/audit/search` — Search audit logs

## Project Structure

```
formsync/
├── docker-compose.yml
├── .env.example
├── backend/
│   ├── pom.xml
│   ├── Dockerfile
│   └── src/main/java/com/formsync/
│       ├── config/          # Security, Flowable, CORS config
│       ├── controller/      # REST controllers (6)
│       ├── model/           # JPA entities (10)
│       ├── repository/      # Spring Data repos (10)
│       ├── service/         # Business logic + CBS/DMS stubs
│       ├── security/        # JWT provider + filter
│       ├── dto/             # Request/response DTOs
│       └── exception/       # Global error handler
├── frontend/
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       ├── api/             # API client with token management
│       ├── context/         # Auth + Theme context providers
│       ├── navigation/      # Role-based tab navigation
│       ├── screens/         # 9 screens (all journey flows)
│       ├── components/      # Reusable UI components
│       ├── types/           # TypeScript interfaces
│       └── utils/           # Validation, formatting utilities
```

## Configuration

### Backend (`application.yml`)
- CBS connector mode: `formsync.cbs.mode: stub` (change to `live` for real T24)
- DMS connector mode: `formsync.dms.mode: stub`
- JWT secret, token expiry, CORS origins — all configurable
- Flowable auto-deploys BPMN from `resources/processes/`

### Frontend
- API URL configured via `EXPO_PUBLIC_API_URL` environment variable
- Theme loaded dynamically from backend API
- Supports bank CSS injection via design tokens

## License

Proprietary — Internal use only.
