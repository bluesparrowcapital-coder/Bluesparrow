# Blue Sparrow - Advanced Mutual Fund Distributor Platform
## Complete System Architecture

---

## 1. OVERVIEW

**Product:** Blue Sparrow MF Distributor Platform  
**Type:** Progressive Web App (PWA) → React Native Mobile App  
**Target Users:** MF Distributors (ARN Holders) + Investors  
**Regulatory:** AMFI, SEBI, BSE StAR MF Compliant  

---

## 2. HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Web App     │  │ Android App  │  │   iPhone App         │  │
│  │ (React.js)   │  │(React Native)│  │  (React Native)      │  │
│  │    PWA       │  │  [Phase 4]   │  │     [Phase 4]        │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
└─────────┼─────────────────┼────────────────────-─┼─────────────┘
          │                 │                       │
          └────────────────-┴───────────────────────┘
                            │  HTTPS / WSS
┌───────────────────────────▼─────────────────────────────────────┐
│                       API GATEWAY LAYER                         │
│               (Nginx + Rate Limiting + SSL)                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    BACKEND SERVICES LAYER                       │
│                                                                 │
│  ┌────────────┐ ┌────────────┐ ┌───────────┐ ┌─────────────┐  │
│  │   Auth     │ │    MF      │ │ Portfolio │ │  Reports    │  │
│  │  Service   │ │  Service   │ │  Service  │ │  Service    │  │
│  └────────────┘ └────────────┘ └───────────┘ └─────────────┘  │
│  ┌────────────┐ ┌────────────┐ ┌───────────┐ ┌─────────────┐  │
│  │ Txn/Order  │ │    SIP     │ │   KYC     │ │Notification │  │
│  │  Service   │ │  Service   │ │  Service  │ │  Service    │  │
│  └────────────┘ └────────────┘ └───────────┘ └─────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                    INTEGRATION LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ BSE StAR MF  │  │  CAMS/KFintech│  │  Payment Gateway     │ │
│  │    API       │  │   (NAV/Folio) │  │  (Razorpay/PayU)     │ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  NSDL/CDSL   │  │   DigiLocker │  │  SMS/Email (Twilio/   │ │
│  │  (e-KYC)     │  │   (Aadhaar)  │  │   SendGrid)           │ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      DATA LAYER                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │  PostgreSQL  │  │    Redis     │  │  AWS S3 / Cloudinary  │ │
│  │  (Primary DB)│  │  (Cache/OTP) │  │  (Documents/KYC Docs) │ │
│  └──────────────┘  └──────────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. TECH STACK

### Frontend (Web → Mobile)
| Layer | Technology | Reason |
|-------|-----------|--------|
| UI Framework | **React.js 18** with TypeScript | Reusable for React Native |
| State Management | **Redux Toolkit** + RTK Query | Predictable state |
| Styling | **Tailwind CSS** + shadcn/ui | Rapid UI development |
| Charts | **Recharts** / ApexCharts | Portfolio visualizations |
| Forms | **React Hook Form** + Zod | Type-safe validation |
| Routing | **React Router v6** | SPA navigation |
| PWA | Vite PWA Plugin | Offline capability |
| Mobile Later | **React Native** (code share) | Shared business logic |

### Backend
| Layer | Technology | Reason |
|-------|-----------|--------|
| Runtime | **Node.js 20 LTS** | Fast I/O, JS ecosystem |
| Framework | **Express.js** with TypeScript | Mature, flexible |
| ORM | **Prisma** | Type-safe DB queries |
| Auth | **JWT** + Refresh Tokens | Stateless auth |
| Validation | **Zod** | Schema validation |
| Queue | **Bull** (Redis-based) | Background jobs |
| Scheduler | **node-cron** | NAV updates, SIP |

### Database
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Primary DB | **PostgreSQL 15** | All transactional data |
| Cache | **Redis 7** | Sessions, OTP, NAV cache |
| File Storage | **AWS S3** / Cloudflare R2 | KYC documents, reports |
| Search | **Meilisearch** | Fund search & filtering |

### DevOps
| Component | Technology |
|-----------|-----------|
| Containerization | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Hosting | AWS EC2 / Railway / Render |
| SSL | Let's Encrypt / Cloudflare |
| Monitoring | Sentry + Datadog |

---

## 4. DATABASE SCHEMA (Core Entities)

```
Users (investors)
├── id, name, email, phone, pan_number
├── aadhaar_last4, dob, gender
├── kyc_status, kyc_verified_at
└── created_at, updated_at

Distributors (ARN Holders)
├── id, user_id (FK)
├── arn_number, euin_number
├── firm_name, sebi_reg_number
└── commission_type, status

Funds (Mutual Fund Schemes)
├── id, scheme_code (BSE/AMFI)
├── fund_house, scheme_name, scheme_type
├── category, sub_category, risk_level
├── nav, nav_date, aum, expense_ratio
├── min_sip_amount, min_lumpsum
└── exit_load, lock_in_period

Portfolios
├── id, user_id, distributor_id
├── folio_number, fund_id
├── units_held, avg_nav, invested_amount
├── current_value, gain_loss
└── last_updated

Transactions
├── id, portfolio_id, user_id, fund_id
├── type (BUY/SELL/SWITCH/SWP/STP)
├── amount, units, nav_at_txn
├── status (PENDING/PROCESSED/FAILED)
├── bse_order_id, payment_ref
└── txn_date, settlement_date

SIP_Mandates
├── id, user_id, fund_id, portfolio_id
├── amount, frequency (MONTHLY/WEEKLY)
├── start_date, end_date, next_date
├── installments_done, total_installments
└── status (ACTIVE/PAUSED/CANCELLED)

KYC_Documents
├── id, user_id
├── doc_type (PAN/AADHAAR/PHOTO/SIGNATURE)
├── doc_url, verified, verified_at
└── rejection_reason

Goals (Financial Goals)
├── id, user_id
├── goal_name, target_amount
├── target_date, current_amount
└── linked_sip_ids[]
```

---

## 5. API STRUCTURE

```
/api/v1/
├── /auth
│   ├── POST /register
│   ├── POST /login
│   ├── POST /refresh-token
│   ├── POST /send-otp
│   ├── POST /verify-otp
│   └── POST /logout
│
├── /kyc
│   ├── POST /initiate
│   ├── POST /upload-documents
│   ├── GET  /status
│   └── POST /verify-pan
│
├── /funds
│   ├── GET  /search?q=&category=&risk=
│   ├── GET  /:schemeCode
│   ├── GET  /:schemeCode/nav-history
│   ├── GET  /:schemeCode/returns
│   ├── GET  /categories
│   └── GET  /top-performers
│
├── /portfolio
│   ├── GET  /                    (dashboard summary)
│   ├── GET  /holdings
│   ├── GET  /transactions
│   ├── GET  /gains-loss
│   └── GET  /statements
│
├── /transactions
│   ├── POST /buy
│   ├── POST /sell (redemption)
│   ├── POST /switch
│   └── GET  /status/:orderId
│
├── /sip
│   ├── POST /create
│   ├── GET  /list
│   ├── PUT  /:sipId/pause
│   ├── PUT  /:sipId/resume
│   └── DELETE /:sipId/cancel
│
├── /goals
│   ├── POST /create
│   ├── GET  /list
│   ├── PUT  /:goalId
│   └── DELETE /:goalId
│
├── /distributor
│   ├── GET  /dashboard
│   ├── GET  /clients
│   ├── GET  /aum-report
│   ├── GET  /commission-report
│   └── GET  /analytics
│
├── /payments
│   ├── POST /create-order
│   ├── POST /verify-payment
│   └── POST /mandate/create (for SIP)
│
└── /notifications
    ├── GET  /list
    ├── PUT  /:id/read
    └── POST /preferences
```

---

## 6. SECURITY ARCHITECTURE

```
Security Layers:
1. HTTPS everywhere (TLS 1.3)
2. JWT Access Token (15min) + Refresh Token (7days)
3. OTP-based login (no plain passwords for sensitive ops)
4. Rate Limiting (100 req/15min per IP)
5. CORS whitelist
6. Helmet.js security headers
7. SQL Injection prevention (Prisma ORM parameterized queries)
8. File upload scanning (malware check for KYC docs)
9. AES-256 encryption for PAN/Aadhaar data at rest
10. Audit logs for all financial transactions
11. 2FA for Distributor admin login
12. SEBI regulatory compliance logging
```

---

## 7. FOLDER STRUCTURE

```
blue-sparrow-mf/
├── frontend/                    # React.js Web App
│   ├── src/
│   │   ├── app/                 # App entry, routing
│   │   ├── components/
│   │   │   ├── ui/              # shadcn base components
│   │   │   ├── charts/          # Portfolio charts
│   │   │   ├── funds/           # Fund cards, lists
│   │   │   ├── portfolio/       # Portfolio views
│   │   │   └── shared/          # Common components
│   │   ├── pages/
│   │   │   ├── auth/            # Login, Register, KYC
│   │   │   ├── dashboard/       # Main dashboard
│   │   │   ├── explore/         # Fund discovery
│   │   │   ├── portfolio/       # My investments
│   │   │   ├── sip/             # SIP management
│   │   │   ├── goals/           # Financial goals
│   │   │   └── distributor/     # Distributor panel
│   │   ├── store/               # Redux store
│   │   ├── services/            # API calls (RTK Query)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── utils/               # Helpers, formatters
│   │   └── types/               # TypeScript types
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── backend/                     # Node.js API Server
│   ├── src/
│   │   ├── controllers/         # Route handlers
│   │   ├── services/            # Business logic
│   │   ├── repositories/        # DB queries (Prisma)
│   │   ├── middleware/          # Auth, validation, rate-limit
│   │   ├── routes/              # Express routes
│   │   ├── jobs/                # Cron jobs (NAV fetch, SIP)
│   │   ├── integrations/        # BSE, CAMS, Razorpay
│   │   ├── utils/               # Helpers
│   │   └── types/               # TypeScript types
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   └── migrations/
│   ├── tests/
│   └── package.json
│
├── shared/                      # Shared between FE & BE
│   ├── types/                   # Common TypeScript types
│   └── constants/               # App constants
│
├── docs/
│   ├── ARCHITECTURE.md          # This file
│   ├── PHASES.md                # Development phases
│   ├── API.md                   # API documentation
│   └── DEPLOYMENT.md            # Deployment guide
│
├── docker-compose.yml
├── .github/workflows/           # CI/CD
└── README.md
```

---

## 8. KEY SCREENS / MODULES

### Investor Side
1. **Onboarding** - Registration → KYC → Bank Linking
2. **Dashboard** - Portfolio summary, returns, quick actions
3. **Explore Funds** - Search, filter, compare, fund details
4. **Invest** - Lumpsum / SIP purchase flow
5. **My Portfolio** - Holdings, transactions, statements
6. **SIP Manager** - Active SIPs, pause/cancel/modify
7. **Goals** - Goal-based investing, calculators
8. **Reports** - Capital gains, ELSS report, portfolio statement

### Distributor Side
9. **Distributor Dashboard** - AUM, client count, revenue
10. **Client Management** - Add/view/manage investors
11. **Business Reports** - Commission, trail income, AUM reports
12. **MF Recommendations** - Model portfolios, rebalancing alerts

---

## 9. THIRD-PARTY INTEGRATIONS

| Service | Purpose | API |
|---------|---------|-----|
| **BSE StAR MF** | Order placement, folio creation | REST API |
| **CAMS / KFintech** | Portfolio fetch, NAV | SOAP/REST |
| **NSDL e-KYC** | eKYC verification | REST API |
| **DigiLocker** | Aadhaar/PAN verification | OAuth 2.0 |
| **Razorpay** | Payments + UPI Autopay (SIP mandate) | REST API |
| **CDSL** | eSign for forms | REST API |
| **AMFI** | NAV data (free) | File download |
| **Twilio** | SMS OTP | REST API |
| **SendGrid** | Transactional emails | REST API |
| **Firebase** | Push notifications (mobile) | SDK |

---

## AS-BUILT — PHASE 1 (May 2026)

### Auth System (Implemented)
| Aspect | Detail |
|--------|--------|
| Registration | phone + email + fullName |
| Login method | 4-digit PIN (bcrypt, 12 rounds) |
| Biometric | WebAuthn FIDO2 via @simplewebauthn v10 |
| Access token | JWT, 15 min, HS256 |
| Refresh token | JWT, 30 days, stored hashed (SHA-256) in DB |
| PIN lockout | 5 failed attempts → locked 30 min (Redis TTL) |
| Rate limits | login: 10/15min · register: 5/hour |

### API Routes (Implemented)
```
POST   /api/auth/register
POST   /api/auth/login/pin
POST   /api/auth/login/biometric/options
POST   /api/auth/login/biometric/verify
POST   /api/auth/register/biometric/options
POST   /api/auth/register/biometric/verify
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/set-pin

GET    /api/onboarding/status
POST   /api/onboarding/profile
PUT    /api/onboarding/profile
GET    /api/onboarding/profile
POST   /api/onboarding/address
GET    /api/onboarding/address
POST   /api/onboarding/nominees
GET    /api/onboarding/nominees
POST   /api/onboarding/kyc/check
POST   /api/onboarding/kyc/submit
GET    /api/onboarding/kyc/status

POST   /api/bank
GET    /api/bank
PATCH  /api/bank/:id/default
DELETE /api/bank/:id
```

### Frontend Routes (Implemented)
```
/auth/register           RegisterPage
/auth/login              LoginPage (PIN + biometric toggle)
/auth/set-pin            SetPinPage (PIN → confirm → biometric opt-in)
/dashboard               DashboardPage + Layout sidebar
/onboarding/status       OnboardingStatusPage (7-step checklist)
/onboarding/profile      CreateProfilePage
/onboarding/address      AddressPage (PERMANENT + CORRESPONDENCE)
/onboarding/nominees     NomineePage (up to 3, % allocation)
/onboarding/bank         BankPage (add/list/default/remove)
/onboarding/kyc          KycStatusPage
```

### What remains for Phase 2
- NSE MF real API (stub in `backend/src/integrations/bse/`)
- Bank penny drop verification (stub in `BankPage` — note shown to user)
- KYC via real KRA API (CAMSKRA / CVL)
- Fund data + portfolio + investment flow

---

## 10. SCALABILITY PLAN

```
Phase 1-2: Monolith (Single backend server)
Phase 3:   Separate Auth + Core services
Phase 4:   Microservices for high-load modules
           (Transactions, Notifications as separate services)
Phase 5:   Kubernetes deployment, Auto-scaling
```
