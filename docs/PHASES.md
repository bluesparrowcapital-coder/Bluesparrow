# Blue Sparrow MF - Development Phases

---

## PHASE OVERVIEW

```
Phase 1  ─── Foundation & Auth           (Week 1-3)
Phase 2  ─── Core MF Features            (Week 4-8)
Phase 3  ─── Advanced Features           (Week 9-14)
Phase 4  ─── Distributor Panel           (Week 15-18)
Phase 5  ─── Mobile App (Android+iOS)    (Week 19-26)
Phase 6  ─── Production & Compliance     (Week 27-30)
```

---

## PHASE 1 — Foundation & Authentication ✅ COMPLETE
### Duration: Week 1–3 | Status: **DONE** (May 2026)

### Goals
- Project setup ✅
- Database design complete ✅
- Auth system (PIN + WebAuthn biometric) ✅
- NSE MF Client onboarding flow ✅
- KYC status tracking ✅

### Tasks

#### 1.1 Project Setup ✅
- [x] React frontend (Vite + TypeScript + Tailwind CSS)
- [x] Node.js backend (Express + TypeScript + Prisma ORM v5)
- [x] PostgreSQL 15 + Redis 7 Docker setup
- [x] Frontend Redux Toolkit + React Router v6
- [x] Vite proxy (`/api` → `localhost:3000`)
- [x] Custom Tailwind design tokens (sparrow-blue, sparrow-teal, etc.)

#### 1.2 Database Setup ✅
- [x] Prisma schema — User, BiometricCredential, RefreshToken, ClientProfile, Address, Nominee, BankAccount, KycStatusLog (+ Phase 2 models: Fund, Portfolio, Transaction, SipMandate, Goal)
- [x] DB migrations
- [x] Seed data (test user: phone=9999999999, PIN=1234)

#### 1.3 Authentication System ✅
- [x] User Registration (name, email, phone)
- [x] 4-digit PIN login (bcrypt hash, lockout after 5 fails → 30 min)
- [x] WebAuthn FIDO2 biometric login (@simplewebauthn v10)
- [x] JWT Access Token (15 min) + Refresh Token (30 days) with rotation
- [x] Refresh token stored hashed (SHA-256) in DB
- [x] Redis: challenge storage (5 min TTL) + PIN lockout state
- [x] Rate limiting: login 10/15min, register 5/hour

#### 1.4 NSE MF Client Onboarding ✅
- [x] Client Profile (PAN, DOB ≥18, gender, occupation, taxStatus, PEP flag)
- [x] Address management (PERMANENT + CORRESPONDENCE, all Indian states)
- [x] Nominee management (up to 3, % allocation must sum 100, minor → guardian)
- [x] Bank account CRUD (up to 5, default account, IFSC validation)
- [x] KYC status tracking (PENDING/SUBMITTED/VERIFIED/REJECTED + log history)
- [x] KYC via KRA check (simulated) + manual submit
- [x] NSE MF submission stub (Phase 2 real API)
- [x] 7-step onboarding checklist with progress %

#### 1.5 UI Foundation ✅
- [x] Shared Layout (sidebar nav + logout)
- [x] Register / Login / SetPin pages
- [x] Onboarding status checklist
- [x] Personal Profile form
- [x] Address form (PERMANENT + CORRESPONDENCE, same-as-permanent toggle)
- [x] Nominees form (dynamic add/remove up to 3, % bar)
- [x] Bank account form + list (add/remove/set-default)
- [x] KYC status page (color-coded + check KRA + submit)
- [x] Dashboard landing

### Deliverables ✅
- Working auth flow (PIN + fingerprint)
- User can register → set PIN → complete full onboarding
- Secure API with JWT, rate limiting, helmet
- Docker: PostgreSQL + Redis running
- Test account seeded

---

## PHASE 2 — Core Mutual Fund Features
### Duration: Week 4–8 | Status: **UPCOMING**

### Goals
- NSE MF real API integration (replace stubs)
- Fund data integration (AMFI NAV)
- Fund discovery & search
- Basic portfolio tracking
- Buy/Invest flow
- Bank penny drop verification

### Tasks

#### 2.0 Complete Phase 1 Stubs (carry-over)
- [ ] NSE MF real API integration (client registration, order placement)
- [ ] Bank account penny drop verification (Razorpay or direct)
- [ ] KYC via real KRA API (CAMSKRA / CVL)

#### 2.1 Fund Data Integration
- [ ] AMFI NAV file download + parse (daily cron job)
- [ ] Fund master data import (all schemes)
- [ ] Fund categories & sub-categories
- [ ] Fund details page (returns, ratios, portfolio)
- [ ] NAV history storage

#### 2.2 Fund Discovery
- [ ] Fund search (Meilisearch integration)
- [ ] Filter by: Category, Risk, Returns, AMC
- [ ] Sort by: Returns (1Y/3Y/5Y), AUM, Rating
- [ ] Fund comparison (up to 3 funds)
- [ ] Fund detail page (full info, NAV chart)

#### 2.3 Investment Flow (Lumpsum)
- [ ] Fund select → Amount input → Review → Pay
- [ ] Payment integration (Razorpay)
- [ ] BSE StAR MF order placement
- [ ] Order status tracking
- [ ] Confirmation + email/SMS

#### 2.4 Basic Portfolio
- [ ] Holdings view (fund, units, current value)
- [ ] Returns calculation (absolute, XIRR)
- [ ] Transaction history
- [ ] Portfolio summary dashboard
- [ ] Gain/Loss display (realized + unrealized)

#### 2.5 Bank Account Linking
- [ ] Add bank account
- [ ] Penny drop verification
- [ ] Default bank for transactions

### Deliverables
✅ User can search and explore mutual funds  
✅ User can invest (lumpsum) via payment gateway  
✅ Portfolio holdings visible after investment  
✅ Daily NAV auto-update via cron job  

---

## PHASE 3 — Advanced Features (SIP, Goals, Reports)
### Duration: Week 9–14

### Goals
- SIP system complete
- Goal-based investing
- Advanced portfolio analytics
- Reports & statements

### Tasks

#### 3.1 SIP Management
- [ ] SIP creation flow (fund → amount → date → mandate)
- [ ] UPI Autopay mandate (Razorpay recurring)
- [ ] SIP scheduler (Bull queue + node-cron)
- [ ] SIP pause / resume / cancel
- [ ] SIP modification (amount, date)
- [ ] SIP history + upcoming installments

#### 3.2 Financial Goals
- [ ] Goal creation (Retirement/Education/House/Custom)
- [ ] Goal target amount + target date
- [ ] Link SIP to goal
- [ ] Goal progress tracker
- [ ] SIP calculator for goal
- [ ] Goal recommendations (suggested funds)

#### 3.3 Portfolio Analytics
- [ ] Asset allocation pie chart (Equity/Debt/Hybrid)
- [ ] Sector allocation
- [ ] Returns comparison (vs Nifty 50, FD rate)
- [ ] XIRR calculation
- [ ] Risk analysis
- [ ] Rebalancing suggestions

#### 3.4 Advanced Transactions
- [ ] Redemption (sell units / full redemption)
- [ ] Switch (from one fund to another)
- [ ] SWP (Systematic Withdrawal Plan)
- [ ] STP (Systematic Transfer Plan)

#### 3.5 Reports & Statements
- [ ] Portfolio statement (PDF download)
- [ ] Capital Gains report (STCG / LTCG)
- [ ] ELSS 80C tax report
- [ ] Transaction summary (date-range filter)

#### 3.6 Notifications
- [ ] Push notifications (in-app)
- [ ] Email notifications (SendGrid)
- [ ] SMS notifications (Twilio)
- [ ] Notification preferences settings
- [ ] NAV alerts (user-set price alerts)

### Deliverables
✅ Complete SIP system with auto-debit  
✅ Goal-based investing module  
✅ Advanced analytics dashboard  
✅ Downloadable reports (PDF)  
✅ Multi-channel notifications  

---

## PHASE 4 — Distributor Panel
### Duration: Week 15–18

### Goals
- Full distributor dashboard
- Client management system
- Commission & AUM reports
- ARN compliance features

### Tasks

#### 4.1 Distributor Dashboard
- [ ] Total AUM overview
- [ ] Client count & new clients this month
- [ ] SIP book (active SIPs value)
- [ ] Revenue/Trail income overview
- [ ] Quick action: Add client, View reports

#### 4.2 Client Management
- [ ] Add new investor (onboard client)
- [ ] Client list with search/filter
- [ ] Individual client portfolio view
- [ ] Client KYC status tracking
- [ ] Client transaction history
- [ ] Bulk client import (Excel)

#### 4.3 Business Reports
- [ ] AUM report by fund/category/date
- [ ] Commission report (upfront + trail)
- [ ] SIP report (active/cancelled/new)
- [ ] Fund-wise performance report
- [ ] Client-wise portfolio report
- [ ] Monthly business summary

#### 4.4 Model Portfolios
- [ ] Create model portfolio (set of funds + %)
- [ ] Assign model portfolio to client
- [ ] Rebalancing alerts when portfolio drifts
- [ ] One-click rebalancing for client

#### 4.5 Compliance
- [ ] AMFI quarterly report generation
- [ ] ARN renewal reminder
- [ ] EUIN tracking for transactions
- [ ] Audit trail for all distributor actions

### Deliverables
✅ Distributor can manage all clients from one dashboard  
✅ Commission and AUM reports ready  
✅ Model portfolio feature live  
✅ Full compliance audit trail  

---

## PHASE 5 — Mobile App (Android + iOS)
### Duration: Week 19–26

### Goals
- React Native app using web codebase logic
- Native mobile features (biometric, push, offline)
- App Store + Play Store deployment

### Tasks

#### 5.1 React Native Setup
- [ ] Expo / React Native CLI setup
- [ ] Shared business logic from web (hooks, utils, API)
- [ ] Navigation (React Navigation)
- [ ] Native UI components (replace web CSS)

#### 5.2 Mobile-Specific Features
- [ ] Biometric authentication (Face ID / Fingerprint)
- [ ] Push notifications (Firebase FCM)
- [ ] Offline portfolio view (cached data)
- [ ] Native camera for KYC document upload
- [ ] UPI deeplink for payments
- [ ] App PIN / security lock

#### 5.3 Screen Migration
- [ ] All Phase 1-4 screens → React Native screens
- [ ] Responsive layouts for different screen sizes
- [ ] Dark mode support

#### 5.4 Deployment
- [ ] Android APK → Play Store
- [ ] iOS IPA → App Store
- [ ] App Store screenshots & descriptions
- [ ] Beta testing (TestFlight / Firebase App Distribution)

### Deliverables
✅ Android app on Play Store  
✅ iOS app on App Store  
✅ All web features available on mobile  
✅ Native mobile features (biometric, push notifications)  

---

## PHASE 6 — Production Hardening & Compliance
### Duration: Week 27–30

### Goals
- Production deployment
- Security audit
- Performance optimization
- SEBI/AMFI compliance final check

### Tasks

#### 6.1 Security Audit
- [ ] Penetration testing
- [ ] OWASP Top 10 audit
- [ ] Data encryption review (PAN, Aadhaar)
- [ ] API security review

#### 6.2 Performance
- [ ] Database query optimization + indexing
- [ ] Redis caching strategy finalize
- [ ] CDN setup (Cloudflare)
- [ ] Load testing (k6)
- [ ] Image optimization

#### 6.3 Monitoring & Alerting
- [ ] Sentry (error tracking)
- [ ] Datadog / New Relic (APM)
- [ ] Uptime monitoring
- [ ] Alert on failed transactions
- [ ] SIP failure alerts

#### 6.4 Compliance
- [ ] SEBI regulatory requirements checklist
- [ ] AMFI code of conduct compliance
- [ ] Data privacy (DPDP Act India)
- [ ] Privacy policy + Terms of service
- [ ] SEBI registered IA disclaimer

#### 6.5 Production Deployment
- [ ] AWS EC2 / ECS setup
- [ ] RDS PostgreSQL (managed)
- [ ] ElastiCache Redis (managed)
- [ ] S3 for documents
- [ ] Cloudflare DNS + DDoS protection
- [ ] Automated backups

### Deliverables
✅ Production-ready, secure deployment  
✅ All compliance requirements met  
✅ Monitoring & alerting live  
✅ Automated backup & recovery tested  

---

## TIMELINE SUMMARY

| Phase | Focus | Duration | Key Output |
|-------|-------|----------|------------|
| 1 | Auth + KYC | 3 weeks | Users can register & KYC |
| 2 | MF Core | 5 weeks | Buy funds, view portfolio |
| 3 | SIP + Goals | 6 weeks | SIP, goals, reports |
| 4 | Distributor | 4 weeks | Full distributor panel |
| 5 | Mobile App | 8 weeks | Android + iOS live |
| 6 | Production | 4 weeks | Fully deployed & secure |
| **TOTAL** | | **30 weeks** | **Complete Platform** |

---

## IMMEDIATE NEXT STEP — Start Phase 1

**Pehle karo:**
1. `Phase 1` start karte hain → Bolo aur frontend + backend scaffold ban jayega
2. Design system choose karo (dark/light theme preference?)
3. Color scheme confirm karo for Blue Sparrow brand
