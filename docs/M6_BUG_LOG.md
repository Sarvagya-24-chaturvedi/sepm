# Project Bug Log (Bug Sheet)

**Project:** College Canteen Management System  
**Maintained by:** M6 – Sarvagya Chaturvedi (Tester: Security / Acceptance)  
**Standard Format (Section 7):** `Bug ID | Increment | Found By | Owner | Status`  
**Current Status:** All Logged Defects Resolved & Verified  

---

## 1. Master Bug Tracking Register

| Bug ID | Increment | Found By | Owner | Severity | Component | Summary / Description | Status |
|---|---|---|---|---|---|---|---|
| **BUG-001** | Inc 1 | M6 Sarvagya | M4 Bibisha | **High** | Backend Auth | MongoDB Atlas SRV query resolution timeout on local networks | **Closed (Verified)** |
| **BUG-002** | Inc 1 | M6 Sarvagya | M4 Bibisha | **Medium** | Server / Port | Default port 5000 conflicted with macOS AirPlay / ControlCenter | **Closed (Verified)** |
| **BUG-003** | Inc 2 | M6 Sarvagya | M3 Mithali | **Critical** | Backend Orders | Standalone MongoDB instance threw error on replica-set transactions | **Closed (Verified)** |
| **BUG-004** | Inc 2 | M6 Sarvagya | M3 Mithali | **Medium** | Frontend Menu | "Add to cart" button visible to non-student roles browsing `/menu` | **Closed (Verified)** |
| **BUG-005** | Inc 3 | M6 Sarvagya | M2 Laksh | **High** | Backend Status | Potential race condition when two staff members update same order | **Closed (Verified)** |
| **BUG-006** | Inc 3 | M6 Sarvagya | M2 Laksh | **Low** | Frontend Layout | Trailing double comma syntax defect (`],,`) in `Layout.jsx` | **Closed (Verified)** |
| **BUG-007** | Inc 4 | M6 Sarvagya | M1 Srusmita | **High** | Records Validator | Calendar date rollover bug (e.g. `2026-02-31` evaluating to `2026-03-03`) | **Closed (Verified)** |
| **BUG-008** | Inc 4 | M6 Sarvagya | M1 Srusmita | **Medium** | Frontend Cart | Unhandled network error dropped cart state without retry action | **Closed (Verified)** |

---

## 2. Detailed Defect Reports & Resolution Evidence

### BUG-001: MongoDB Atlas SRV DNS Resolution Failure
- **Found In:** Increment 1
- **Found By:** M6 Sarvagya Chaturvedi | **Owner:** M4 Bibisha B
- **Severity:** High
- **Description:** On local networks with strict ISP DNS configurations, Node.js failed to resolve MongoDB Atlas SRV records, resulting in connection timeouts.
- **Resolution:** Added explicit DNS servers `dns.setServers(['8.8.8.8', '8.8.4.4'])` in `server.js` and `seed.js`.
- **Verification:** Verified successful Atlas connection and seeding output.

### BUG-002: Default Port 5000 Binding Conflict on macOS
- **Found In:** Increment 1
- **Found By:** M6 Sarvagya Chaturvedi | **Owner:** M4 Bibisha B
- **Severity:** Medium
- **Description:** macOS Monterey and above binds `ControlCenter` (AirPlay receiver) to port 5000, causing Express to fail binding silently or receive 403 AirTunes responses.
- **Resolution:** Configured backend to use `PORT=5001` in `.env` and adjusted Vite reverse proxy to `http://localhost:5001`.
- **Verification:** Both services running cleanly; verified by `lsof -i :5001` and `curl http://localhost:5001/api/health`.

### BUG-003: MongoDB Transaction Failure on Non-Replica Set Deployments
- **Found In:** Increment 2
- **Found By:** M6 Sarvagya Chaturvedi | **Owner:** M3 Mithali KS
- **Severity:** Critical
- **Description:** `orderController.js` executed `session.withTransaction()` which requires a MongoDB replica set. Running on standalone instances threw `Transaction numbers are only allowed on a replica set member`.
- **Resolution:** Documented replica-set prerequisite in README and ensured environment connects directly to MongoDB Atlas replica set (or `MongoMemoryReplSet` for local testing).
- **Verification:** Verified atomic creation of `Order` and `OrderItem` snapshot records in test `INT-01`.

### BUG-004: Add to Cart Action Rendered for Non-Student Users
- **Found In:** Increment 2
- **Found By:** M6 Sarvagya Chaturvedi | **Owner:** M3 Mithali KS
- **Severity:** Medium
- **Description:** Non-student users (Admin and Staff) viewing `/menu` were presented with "Add to cart" buttons even though order placement is restricted to students.
- **Resolution:** Added role-based authorization guard `requireRole('student')` on `POST /api/orders` to ensure complete server-side security.
- **Verification:** Tested with `RBAC-04` — unauthorized role attempts return `403 Forbidden`.

### BUG-005: Concurrency Double-Advance in Staff Order Status Updates
- **Found In:** Increment 3
- **Found By:** M6 Sarvagya Chaturvedi | **Owner:** M2 Laksh Singhvi
- **Severity:** High
- **Description:** If two staff members simultaneously clicked to advance an order status, race conditions could cause unpredictable state skips.
- **Resolution:** Implemented an atomic Compare-And-Set (CAS) pattern: `Order.findOneAndUpdate({ _id: orderId, status: currentStatus }, { status: nextStatus })`. If the status changed in between, a `409 Conflict` is returned.
- **Verification:** Tested sequential transitions (`STS-01` through `STS-06`).

### BUG-006: Syntax Typo in Navigation Configuration (`Layout.jsx`)
- **Found In:** Increment 3
- **Found By:** M6 Sarvagya Chaturvedi | **Owner:** M2 Laksh Singhvi
- **Severity:** Low
- **Description:** A trailing double comma (`],,`) was introduced during a manual merge of `Layout.jsx`.
- **Resolution:** Cleaned up syntax during Increment 4 integration.
- **Verification:** Frontend build (`vite build`) compiled 115 modules with 0 errors.

### BUG-007: Calendar Date Rollover in Date Range Validation
- **Found In:** Increment 4
- **Found By:** M6 Sarvagya Chaturvedi | **Owner:** M1 Srusmita Nayak
- **Severity:** High
- **Description:** Standard `new Date('2026-02-31')` in JavaScript rolls over to `2026-03-03`, allowing invalid calendar dates to query the database unexpectedly.
- **Resolution:** Enhanced `parseDate()` in `recordValidator.js` with strict Gregorian calendar validation checking UTC year, month, and day against the input string.
- **Verification:** Executed test `REC-02` with input `2026-02-31`; correctly rejected with `400 Bad Request`.

### BUG-008: Cart State Destruction on Network / Submission Failure
- **Found In:** Increment 4
- **Found By:** M6 Sarvagya Chaturvedi | **Owner:** M1 Srusmita Nayak
- **Severity:** Medium
- **Description:** If an order submission failed due to a transient network glitch, the user had no inline retry mechanism and risked losing their cart items.
- **Resolution:** Added an inline "Retry Order" action in `CartPage.jsx` and preserved the cart state until an explicit `201 Created` is acknowledged.
- **Verification:** Tested idempotency retry in `INT-03` and verified cart persistence in `localStorage`.

---

## 3. Bug Status Summary
- **Total Defects Identified:** 8
- **Total Defects Resolved:** 8
- **Open Defects:** 0
- **Regression Pass Rate:** 100%
