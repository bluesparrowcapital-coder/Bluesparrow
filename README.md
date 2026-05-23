# Blue Sparrow MF Platform

Advanced Mutual Fund Distributor Platform — Web App (PWA) with future Android & iOS support.

**Current Status: Phase 1 COMPLETE ✅** — Auth + NSE MF Onboarding foundation ready

---

## Quick Start (Phase 1)

### Prerequisites
- Node.js 20+
- Docker & Docker Compose

### Step 1 — Docker se DB + Redis start karo
```powershell
cd "d:\Blue Sparow new"
docker-compose up -d
# Verify: docker ps  →  blue_sparrow_postgres + blue_sparrow_redis should show "Up"
```

### Step 2 — Backend setup
```powershell
cd "d:\Blue Sparow new\backend"
npm install
npx prisma migrate dev --name init
npx prisma generate
npx ts-node prisma/seed.ts       # Test user: phone=9999999999, PIN=1234
npm run dev                       # Starts on http://localhost:3000
```

### Step 3 — Frontend setup (naya terminal)
```powershell
cd "d:\Blue Sparow new\frontend"
npm install
npm run dev                       # Starts on http://localhost:5173
```

### Health Check
```
GET http://localhost:3000/health  →  {"status":"ok","service":"blue-sparrow-mf-api"}
```

---

## Test Accounts

| Phone | PIN | Role |
|-------|-----|------|
| 9999999999 | 1234 | INVESTOR (seeded) |

---

## Project Structure

```
blue-sparrow-mf/
├── frontend/                     React 18 + Vite + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/             RegisterPage, LoginPage, SetPinPage
│   │   │   └── onboarding/       OnboardingStatusPage, CreateProfilePage, AddressPage, NomineePage, BankPage, KycStatusPage
│   │   ├── components/
│   │   │   ├── ui/               PinInput, StepProgress
│   │   │   └── shared/           Layout (sidebar nav)
│   │   ├── hooks/                useBiometric (WebAuthn)
│   │   ├── services/             api.ts, authService.ts, onboardingService.ts
│   │   ├── store/                Redux store + authSlice
│   │   └── App.tsx               React Router v6 routes
│   ├── vite.config.ts            /api proxy → localhost:3000
│   ├── tailwind.config.js        Custom colors: sparrow-blue, sparrow-teal, etc.
│   └── .env                      VITE_API_URL=http://localhost:3000/api
│
├── backend/                      Node.js 20 + Express + TypeScript + Prisma
│   ├── src/
│   │   ├── routes/               authRoutes, onboardingRoutes
│   │   ├── controllers/          authController, onboardingController
│   │   ├── services/             authService, clientProfileService, kycService
│   │   ├── middleware/           authMiddleware (JWT Bearer)
│   │   └── utils/                jwt.ts, redis.ts, validators.ts, logger.ts
│   ├── prisma/
│   │   ├── schema.prisma         Full schema (User, BiometricCredential, ClientProfile, BankAccount, etc.)
│   │   └── seed.ts               Test user seeder
│   ├── tsconfig.json
│   └── .env                      Local dev config (DB, Redis, JWT secrets, WebAuthn)
│
├── shared/                       Common types and constants
├── docs/                         Architecture & Phases docs
└── docker-compose.yml            postgres:15-alpine + redis:7-alpine + meilisearch
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS, Redux Toolkit, React Router v6 |
| Backend | Node.js 20, Express, TypeScript, Prisma ORM v5 |
| Auth | 4-digit PIN (bcrypt) + WebAuthn FIDO2 biometric (@simplewebauthn v10) |
| JWT | Access token (15min) + Refresh token (30d) with rotation |
| Database | PostgreSQL 15 |
| Cache | Redis 7 (challenges, PIN lockout) |
| Mobile | React Native (Phase 5) |

---

## API Routes (Phase 1)

### Auth — `/api/auth`
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/register` | — | New user register (phone, email, name) |
| POST | `/pin/set` | ✅ JWT | Set 4-digit PIN after register |
| POST | `/pin/login` | — | Login with phone + PIN |
| GET | `/biometric/register-options` | ✅ JWT | WebAuthn registration challenge |
| POST | `/biometric/register` | ✅ JWT | Save biometric credential |
| POST | `/biometric/auth-options` | — | WebAuthn login challenge |
| POST | `/biometric/verify` | — | Verify biometric + issue tokens |
| POST | `/refresh` | — | Refresh access token |
| POST | `/logout` | ✅ JWT | Invalidate refresh token |

### Onboarding — `/api/onboarding` (all JWT protected)
| Method | Route | Description |
|--------|-------|-------------|
| GET | `/status` | 7-step onboarding checklist |
| POST | `/profile` | Create/update NSE MF client profile |
| GET | `/profile` | Fetch client profile |
| POST | `/address` | Save address (PERMANENT / CORRESPONDENCE) |
| GET | `/address` | Get all addresses |
| POST | `/nominees` | Save nominees (1-3, sum=100%) |
| GET | `/nominees` | Get saved nominees |
| POST | `/nse-submit` | Submit to NSE MF (stubbed for Phase 2) |
| GET | `/kyc/status` | KYC status with color + history |
| POST | `/kyc/check-kra` | Check KYC from KRA (simulated) |
| POST | `/kyc/submit` | Submit KYC request |

### Bank — `/api/bank` (all JWT protected)
| Method | Route | Description |
|--------|-------|-------------|
| POST | `/` | Add bank account (max 5, IFSC validated) |
| GET | `/` | List all bank accounts |
| PATCH | `/:id/default` | Set default bank account |
| DELETE | `/:id` | Remove bank account |

---

## Phase Progress

### ✅ Phase 1 — Foundation & Auth (COMPLETE)
- [x] Docker setup (PostgreSQL + Redis)
- [x] Backend: Express + TypeScript + Prisma schema (all models)
- [x] Auth: 4-digit PIN login (bcrypt + lockout after 5 fails)
- [x] Auth: WebAuthn FIDO2 fingerprint login (@simplewebauthn v10)
- [x] Auth: JWT access (15min) + refresh (30d) tokens with rotation
- [x] Onboarding: NSE MF Client Profile creation (PAN, DOB, gender, occupation, taxStatus)
- [x] Onboarding: Address management (PERMANENT + CORRESPONDENCE, all Indian states)
- [x] Onboarding: Nominee management (up to 3, allocation 100%, minor guardian)
- [x] Onboarding: Bank account CRUD (max 5, IFSC validation, default, remove)
- [x] Onboarding: KYC status display + KRA check + submit request
- [x] Onboarding: 7-step progress checklist
- [x] Frontend: React 18 + Vite + Tailwind + Redux Toolkit
- [x] Frontend: Auth pages (Register, Login, SetPin with biometric opt-in)
- [x] Frontend: Onboarding pages (Status, CreateProfile, Address, Nominees, Bank, KYC)
- [x] Frontend: Shared Layout component (sidebar nav + logout)
- [x] Frontend: Dashboard landing page
- [x] Frontend: Vite proxy + Redux auth state persistence (localStorage)
- [x] Test seed: phone=9999999999, PIN=1234

### 🔜 Phase 2 — Portfolio & Investments
- [ ] NSE MF real API integration
- [ ] Bank penny drop verification
- [ ] KYC real KRA API (CAMSKRA / CVL)
- [ ] Fund search (MeilisSearch + AMFI NAV data)
- [ ] SIP & Lumpsum order placement
- [ ] Portfolio dashboard

### 🔜 Phase 3 — Advanced Features
- [ ] Distributor panel
- [ ] Goal-based investing
- [ ] Reports & statements

---

## Documentation

- [Architecture](./docs/ARCHITECTURE.md) — System design, DB schema
- [Phases](./docs/PHASES.md) — Full roadmap
