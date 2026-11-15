# Security & Acceptance Test Report (Final Regression)

**Project:** College Canteen Management System  
**Lead Tester:** Sarvagya Chaturvedi (M6 – Tester: Security & Acceptance)  
**Execution Environment:** macOS, Node.js v26.7.0, Express 4.21.2, React 19 (Vite 6), MongoDB Atlas (Replica Set)  
**Date of Testing:** 15 November 2026  
**Document Status:** Formal Sign-Off for Release  

---

## 1. Executive Summary

As the designated **M6 Security and Acceptance Tester** for Team 7, I have conducted a comprehensive test audit covering:
1. **Role-Based Access Control (RBAC):** Strict isolation between Student, Staff, and Admin roles.
2. **Data Integrity & Transaction Atomicity:** Verification of server-calculated pricing, snapshot item storage, idempotency, and MongoDB transactions.
3. **Invalid Input Handling:** Boundary, fuzz, type-mismatch, and date rollover testing.
4. **Acceptance Criteria Verification:** Full execution of all remaining criteria (**AC-01 through AC-12**, noting payment criteria AC-04 and AC-05 removed under CR-02).
5. **Non-Functional Requirements (NFRs):** Response time verification (< 500ms benchmark).

### Overall Test Metrics
- **Total Test Cases Executed:** 34
- **Passed:** 34
- **Failed:** 0
- **Pass Rate:** **100%**
- **Defects Found & Closed:** 8 / 8
- **Acceptance Criteria Pass Rate:** **10 / 10 Active Criteria Passed (100%)**

---

## 2. Test Execution Details by Category

### Category A: Credential Security & Authentication (FR-01, FR-02, SEC-01)

| Test ID | Test Case Name | Objective / Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| `SEC-01` | Bcrypt Password Hashing | Inspect `passwordHash` field for seeded demo accounts in MongoDB. | Starts with `$2b$10$` and length = 60 chars. | Verified `$2b$10$...` stored; plaintext passwords never saved. | **PASS** |
| `SEC-02` | Default Query Exclusion | Query user document using `User.findOne()` without explicit `.select('+passwordHash')`. | `passwordHash` must be `undefined`. | Property `passwordHash` is excluded from default queries and JSON serialization. | **PASS** |
| `SEC-03` | JWT Cookie Security Flags | Submit valid login and inspect `Set-Cookie` header response. | Contains `HttpOnly`, `SameSite=Lax`, and 24h expiration. | Both `HttpOnly` and `SameSite=Lax` verified on auth cookie. (188ms) | **PASS** |
| `SEC-04` | Invalid Password Handling | Attempt login with existing email but incorrect password. | Returns `401 Unauthorized` with generic message: `"Invalid credentials"`. | Returned `401` with `"Invalid credentials"`. (156ms) | **PASS** |
| `SEC-05` | User Enumeration Prevention | Attempt login with non-existent email (`fakeuser9999@canteen.edu`). | Returns identical `401` message to prevent attacker email discovery. | Returned identical `401` with `"Invalid credentials"`. (54ms) | **PASS** |
| `SEC-06` | Auth Input Validation | Submit malformed email (`notanemail`) and short password. | Zod validator rejects request with `400 Bad Request`. | Returned `400 Bad Request` with field error diagnostics. | **PASS** |

---

### Category B: Role-Based Access Control (RBAC) (FR-17, AC-09)

| Test ID | Test Case Name | Role Tested | Endpoint | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|---|
| `RBAC-01` | Unauthenticated Access Guard | Unauthenticated | `/api/orders`, `/api/staff/orders`, `/api/staff/records` | `401 Unauthorized` on all | Blocked with `401 Authentication required`. | **PASS** |
| `RBAC-02` | Student Blocked from Staff Queue | Student (`rohan`) | `GET /api/staff/orders` | `403 Forbidden` | Blocked with `403 Forbidden: insufficient permissions`. | **PASS** |
| `RBAC-03` | Student Blocked from Records | Student (`rohan`) | `GET /api/staff/records` | `403 Forbidden` | Blocked with `403 Forbidden: insufficient permissions`. | **PASS** |
| `RBAC-04` | Student Blocked from Menu CRUD | Student (`rohan`) | `POST /api/menu` | `403 Forbidden` | Blocked with `403 Forbidden: insufficient permissions`. | **PASS** |
| `RBAC-05` | Staff Blocked from Menu CRUD | Staff (`priya`) | `POST /api/menu` | `403 Forbidden` | Admin-only restriction enforced; returned `403`. | **PASS** |
| `RBAC-06` | Admin Authorized for Records | Admin (`aarav`) | `GET /api/staff/records` | `200 OK` | Successfully retrieved records and revenue data. | **PASS** |

---

### Category C: Data Integrity, Pricing & Financial Accuracy (FR-04, FR-18, FR-19, AC-03)

| Test ID | Test Case Name | Objective / Steps | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| `INT-01` | Server-Side Price Calculation | Submit order payload tampering `unitPrice: 0.01` and `totalAmount: 0.02`. | Server ignores client prices and re-calculates strictly from DB. | Actual total recorded: ₹50.00 (correct 2 × ₹25.00 for Samosa). Tampered client amounts ignored. | **PASS** |
| `INT-02` | Historical Snapshot Integrity | Verify `OrderItem` stores snapshot `itemName`, `unitPrice`, `subtotal`. | Future menu changes must not alter past order line items. | `OrderItem` snapshot confirmed: `itemName="Samosa (2 pcs)"`, `unitPrice=25`. | **PASS** |
| `INT-03` | Idempotency Protection | Submit two identical order requests sharing the same `Idempotency-Key`. | First returns `201 Created`; second returns `200 OK` returning identical order without creating duplicate. | Exactly 1 Order created in DB; second request returned existing order `ORD-1794757872663-1965`. | **PASS** |
| `INT-04` | Cross-Tenant Isolation | Student B attempts `GET /api/orders/:orderId` belonging to Student A. | `404 Not Found` (avoids leaking existence of other students' orders). | Returned `404 Not Found`. Cross-tenant privacy protected. | **PASS** |

---

### Category D: Invalid Inputs & Boundary Testing (FR-16, AC-02, AC-07, AC-10)

| Test ID | Test Case Name | Input Injected | Expected Result | Actual Result | Status |
|---|---|---|---|---|---|
| `INP-01` | Negative Quantity | `{ quantity: -2 }` in order items array | `400 Bad Request` | Zod validator rejected: `Quantity must be a positive integer`. | **PASS** |
| `INP-02` | Decimal Quantity | `{ quantity: 1.75 }` in order items array | `400 Bad Request` | Zod validator rejected: `Quantity must be an integer`. | **PASS** |
| `INP-03` | Duplicate Item IDs | `[ { id: X, qty: 1 }, { id: X, qty: 2 } ]` | `400 Bad Request` | `superRefine` rejected: `Each menu item may only appear once`. | **PASS** |
| `INP-04` | Non-Existent Menu Item | `menuItemId: "507f1f77bcf86cd799439099"` | `409 Conflict` | Returned `409`: `One or more selected menu items are unavailable`. | **PASS** |
| `INP-05` | Unavailable Item Ordering | Ordering item with `isAvailable: false` (Poha) | `409 Conflict` | Returned `409 Conflict`. Order blocked. | **PASS** |
| `STS-01` | Valid Status Progression | Staff advances `Placed` ➔ `Confirmed` | `200 OK` | Status moved to `Confirmed`. | **PASS** |
| `STS-02` | Backward Transition Guard | Staff attempts `Confirmed` ➔ `Placed` | `409 Conflict` | Returned `409`: `Cannot move order from Confirmed to Placed`. | **PASS** |
| `STS-03` | Skipping Transition Guard | Staff attempts `Confirmed` ➔ `Ready` | `409 Conflict` | Returned `409`: `Cannot move order from Confirmed to Ready`. | **PASS** |
| `STS-04` | Unauthorized Status Change | Student attempts `PATCH /api/staff/orders/:id/status` | `403 Forbidden` | Returned `403 Forbidden`. | **PASS** |
| `STS-05` | Full Lifecycle Completion | `Placed` ➔ `Confirmed` ➔ `Preparing` ➔ `Ready` ➔ `Completed` | Final status `Completed` | Order reached `Completed` successfully. | **PASS** |
| `STS-06` | Completed Order Immutability | Attempt to modify order that is already `Completed` | `409 Conflict` | Returned `409`: `Order is already Completed and cannot be changed`. | **PASS** |
| `REC-01` | Inverted Date Range | `startDate=2026-11-20&endDate=2026-11-10` | `400 Bad Request` | Returned `400`: `Start date cannot be after end date`. | **PASS** |
| `REC-02` | Calendar Rollover Guard | `startDate=2026-02-31` | `400 Bad Request` | Returned `400`: `Invalid startDate. Must be a valid date`. | **PASS** |
| `REC-03` | Status Filter Integrity | `GET /api/staff/records?status=Completed` | `200 OK` (Only completed returned) | Returned 100% `Completed` records with accurate revenue calculation. (165ms) | **PASS** |

---

### Category E: Non-Functional Requirements & Performance (NFRs)

*Standard NFR Criteria: API response time must not exceed 500ms under standard operational load.*

| Endpoint Tested | Method | Measured Response Time | Threshold | Status |
|---|---|---|---|---|
| `/api/menu` | `GET` | **76 ms** | < 500 ms | **PASS (Superior)** |
| `/api/orders/my` | `GET` | **108 ms** | < 500 ms | **PASS (Superior)** |
| `/api/staff/orders` | `GET` | **179 ms** | < 500 ms | **PASS (Superior)** |
| `/api/staff/records` | `GET` | **184 ms** | < 500 ms | **PASS (Superior)** |

---

## 3. Acceptance Criteria (AC) Run Matrix

- **AC-01 (Authentication & Roles):** **PASSED**  
  Verified Student, Staff, and Admin logins redirect to their respective landing pages (`/menu`, `/staff`, `/admin/menu`).
- **AC-02 (Cart Editing & Calculations):** **PASSED**  
  Verified items can be added, incremented, decremented, and removed, with dynamic price totals.
- **AC-03 (Order Creation & Transactions):** **PASSED**  
  Verified atomic creation of `Order` + `OrderItem`, generation of `ORD-...`, and cart clearing upon receipt.
- ~~AC-04 & AC-05 (Payment Modules):~~ **EXCLUDED** under approved Change Request CR-02.
- **AC-06 (Order Status Visibility):** **PASSED**  
  Verified multi-step visual progress pipeline on `/orders` tracking live stages.
- **AC-07 (Staff Order Queue & Lifecycle):** **PASSED**  
  Verified staff status advancement and rejection of invalid/backward transitions with 409 Conflict.
- **AC-08 (Menu Navigation & Unavailable Items):** **PASSED**  
  Verified category filtering and order prohibition for unavailable items.
- **AC-09 (Role-Based Route Protection):** **PASSED**  
  Verified unauthenticated users and unauthorized roles are blocked via middleware and client ProtectedRoutes.
- **AC-10 (Historical Records & Revenue):** **PASSED**  
  Verified date-range filtering, status filtering, and aggregation of total revenue.
- **AC-11 (Admin Menu Management):** **PASSED**  
  Verified admin dish addition, price editing, and availability toggling without data loss.
- **AC-12 (Error Handling & Retry):** **PASSED**  
  Verified inline "Retry Order" action and preservation of user cart on network or validation errors.

---

## 4. Final Tester Sign-Off

All test suites, acceptance criteria, security audits, and data integrity verifications have completed with **100% pass rates**. All previously discovered defects (BUG-001 through BUG-008) have been fully resolved and regression-tested.

The College Canteen Management System is hereby **APPROVED FOR FINAL SUBMISSION AND DEPLOYMENT**.

**Tester:** Sarvagya Chaturvedi (M6)  
**Date:** 15 November 2026  
**Role:** Tester (Security / Acceptance)  
**Signature:** *Sarvagya Chaturvedi*
