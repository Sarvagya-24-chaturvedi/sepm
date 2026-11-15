# Requirements Traceability Matrix (RTM)

**Project:** College Canteen Management System  
**Team:** Team 7 (6 Members)  
**Role:** M6 – Sarvagya Chaturvedi (Tester: Security / Acceptance)  
**Scope Baseline:** Increments 1 to 4 (Post Change Request CR-02: Payment Module Removed)  
**Date of Verification:** 15 November 2026  
**Status:** All 17 Functional Requirements Verified & Signed Off  

---

## 1. Scope Change Register: CR-02 (Payment Module Removed)

As per the approved project work division agreement (CR-02), payment processing was officially eliminated from the project scope:
- **Removed Requirements:** FR-06 (Payment options), FR-07 (Payment state tracking), FR-11 (Counter payment verification).
- **Removed Acceptance Criteria:** AC-04 (Payment method selection), AC-05 (Payment confirmation).
- **Removed Use Cases & Rules:** UC-03 (Make/Record Payment), BR-07, BR-08, DO-06 (Payment entity).
- **Remaining Functional Requirements:** Exactly 17 requirements across Increments 1, 2, 3, and 4.
- **Order Flow Impact:** Orders transition directly from placement (`Placed`) to kitchen confirmation (`Confirmed`).

---

## 2. Requirements Traceability Matrix (Forward & Backward Traceability)

| Req ID | Requirement Description | Use Case | Increment | Dev Owner | Test Case ID(s) | Acceptance Criteria (AC) | Result |
|---|---|---|---|---|---|---|---|
| **FR-01** | User authentication with email and hashed password for Student, Staff, and Admin roles | UC-01 | Inc 1 | M4 Bibisha | `SEC-01`, `SEC-02`, `SEC-03`, `SEC-04`, `SEC-05` | **AC-01** | **PASS** |
| **FR-02** | User session logout and secure clearing of HTTP-only JWT auth cookie | UC-01 | Inc 1 | M4 Bibisha | `SEC-03`, `RBAC-01` | **AC-01** | **PASS** |
| **FR-03** | Persistent shopping cart (add items, modify quantities, remove items) | UC-02 | Inc 2 | M3 Mithali | `INP-01`, `INP-02`, `AC-02-TC` | **AC-02** | **PASS** |
| **FR-04** | Order price calculation strictly derived server-side (price × quantity, client totals ignored) | UC-02 | Inc 2 | M3 Mithali | `INT-01`, `INT-02` | **AC-03** | **PASS** |
| **FR-05** | Order placement generating unique Order ID (`ORD-...`) with initial status `Placed` | UC-02 | Inc 2 | M3 Mithali | `INT-01`, `INT-03` | **AC-03** | **PASS** |
| ~~FR-06~~ | *Payment options (Cash/UPI/Card)* — **Removed under CR-02** | — | — | — | — | ~~AC-04~~ | **N/A** |
| ~~FR-07~~ | *Payment state tracking* — **Removed under CR-02** | — | — | — | — | ~~AC-05~~ | **N/A** |
| **FR-08** | Student order status tracking on dedicated "My Orders" interface | UC-04 | Inc 3 | M2 Laksh | `INT-04`, `PERF-_api_orders_my` | **AC-06** | **PASS** |
| **FR-09** | Staff dashboard listing incoming and active orders queue | UC-05 | Inc 3 | M2 Laksh | `RBAC-02`, `PERF-_api_staff_orders` | **AC-07** | **PASS** |
| **FR-10** | Order status lifecycle transitions (`Placed` ➔ `Confirmed` ➔ `Preparing` ➔ `Ready` ➔ `Completed`) | UC-05 | Inc 3 | M2 Laksh | `STS-01`, `STS-02`, `STS-03`, `STS-05`, `STS-06` | **AC-07** | **PASS** |
| ~~FR-11~~ | *Counter payment verification* — **Removed under CR-02** | — | — | — | — | — | **N/A** |
| **FR-12** | Menu display categorized into Breakfast, Meals, Snacks, Beverages with category filtering | UC-06 | Inc 1 | M4 Bibisha | `PERF-_api_menu` | **AC-08** | **PASS** |
| **FR-13** | Clear visual indication and order prevention for unavailable menu items | UC-06 | Inc 1 | M4 Bibisha | `INP-05` | **AC-08** | **PASS** |
| **FR-14** | Admin menu management: add, edit, price, and toggle availability without hard deletion | UC-06 | Inc 1 | M4 Bibisha | `RBAC-04`, `RBAC-05`, `AC-11-TC` | **AC-11** | **PASS** |
| **FR-15** | Order records history with date-range filters, status filters, and revenue aggregations | UC-07 | Inc 4 | M1 Srusmita | `REC-01`, `REC-02`, `REC-03`, `RBAC-03`, `RBAC-06` | **AC-10** | **PASS** |
| **FR-16** | Comprehensive input validation, type coercion, and edge-case sanitization (Zod schemas) | All | Inc 1, 4 | M1, M4 | `SEC-06`, `INP-01`, `INP-02`, `INP-03`, `REC-01`, `REC-02` | **AC-01, AC-12** | **PASS** |
| **FR-17** | Role-based access control (RBAC) ensuring strict separation between Student, Staff, and Admin | All | Inc 1 | M4 Bibisha | `RBAC-01`, `RBAC-02`, `RBAC-03`, `RBAC-04`, `RBAC-05`, `STS-04` | **AC-09** | **PASS** |
| **FR-18** | Order placement idempotency and safe network retry using `Idempotency-Key` header | UC-02 | Inc 2 | M3 Mithali | `INT-03` | **AC-03, AC-12** | **PASS** |
| **FR-19** | Atomic database transactions saving `Order` and snapshot `OrderItem` documents simultaneously | UC-02 | Inc 2 | M3 Mithali | `INT-01`, `INT-02` | **AC-03** | **PASS** |
| **FR-20** | Non-destructive client error recovery and cart preservation on retry | UC-02, 07 | Inc 4 | M1 Srusmita | `INT-03`, `AC-12-TC` | **AC-12** | **PASS** |

---

## 3. Acceptance Criteria (AC) Verification Summary

| AC ID | Acceptance Criteria Definition | Increment | Associated FRs | M6 Verification Status |
|---|---|---|---|---|
| **AC-01** | Valid credentials allow login with correct role landing; invalid credentials yield generic error; session cookie is HttpOnly. | Inc 1 | FR-01, FR-02, FR-16 | **PASS (100%)** |
| **AC-02** | Student can add available items to cart, adjust quantities (integers only), and view calculated totals. | Inc 2 | FR-03, FR-16 | **PASS (100%)** |
| **AC-03** | Order is atomically created with status `Placed`, server-calculated prices, snapshot items, and cart cleared upon confirmation. | Inc 2 | FR-04, FR-05, FR-18, FR-19 | **PASS (100%)** |
| ~~AC-04~~ | *Customer selects payment method* — **Removed under CR-02** | Inc 2 | ~~FR-06~~ | **EXCLUDED (CR-02)** |
| ~~AC-05~~ | *Staff verifies payment receipt* — **Removed under CR-02** | Inc 2 | ~~FR-07~~ | **EXCLUDED (CR-02)** |
| **AC-06** | Student can track order progress in real-time across the status lifecycle on the My Orders screen. | Inc 3 | FR-08, FR-10 | **PASS (100%)** |
| **AC-07** | Staff can advance orders sequentially; invalid, skipped, or backward transitions are rejected with 409 Conflict. | Inc 3 | FR-09, FR-10, FR-17 | **PASS (100%)** |
| **AC-08** | Menu items are filtered by category; unavailable items are clearly badged and cannot be ordered. | Inc 1 | FR-12, FR-13 | **PASS (100%)** |
| **AC-09** | Role-based dashboards are protected; unauthorized access is blocked (401/403) and students cannot access staff/admin screens. | Inc 1 | FR-17 | **PASS (100%)** |
| **AC-10** | Staff and Admin can view historical records, filter by custom date range and status, and view total revenue calculations. | Inc 4 | FR-15, FR-16 | **PASS (100%)** |
| **AC-11** | Admin can add, edit, and toggle availability of menu items; soft-state changes preserve historical orders. | Inc 1 | FR-14, FR-17 | **PASS (100%)** |
| **AC-12** | Clear error and retry messages are presented; user cart is preserved upon request failure; retry is safe and non-duplicative. | Inc 4 | FR-16, FR-18, FR-20 | **PASS (100%)** |

---

## 4. Coverage Metrics & Sign-Off

- **Total Functional Requirements in Baseline:** 17
- **Requirements Covered by Test Suite:** 17 (100% Coverage)
- **Total Acceptance Criteria in Baseline:** 10 (AC-01, 02, 03, 06, 07, 08, 09, 10, 11, 12)
- **Acceptance Criteria Passing:** 10 / 10 (100%)
- **M6 Tester Sign-off:** **APPROVED FOR FINAL INTEGRATION & RELEASE**  
  *Signature:* Sarvagya Chaturvedi (M6 – Security & Acceptance Tester)
