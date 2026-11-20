# Functional and UI Test Report

**Project:** College Canteen Management System  
**Test date:** 21 November 2026
**Scope:** Increments 1–4  
**Result:** PASS

## Execution summary

| Suite | Runner | Result |
|---|---|---|
| Server functional/API and existing regression tests | Jest | 57 passed |
| Client UI interaction tests | Vitest + React Testing Library + jsdom | 15 passed |
| Client production build | Vite | Passed; 115 modules transformed |

**Automated tests:** 72 passed, 0 failed.

**Responsive browser spot-check:** Menu at 375px and staff/admin lists at 320px
showed no page-level horizontal overflow; menu photos loaded successfully.

The API tests exercise Express routes with mocked model/database calls; they do
not claim to test a live MongoDB deployment or transaction implementation. The
UI tests render the actual React pages and mock HTTP responses. The complete app
still requires the configured MongoDB database for manual end-to-end use.

## Test cases by increment

### Increment 1 — Login, menu, validation, and categories

| ID | Type | Scenario | Expected result |
|---|---|---|---|
| I1-API-01 | API | Valid login and malformed login payload | Valid login returns user and HTTP-only, SameSite=Lax cookie; malformed input returns 400. |
| I1-API-02 | API | Unauthenticated and category-filtered menu access | Unauthenticated request is rejected; authenticated request returns the selected category and available category list. |
| I1-API-03 | API | Admin menu creation and student write attempt | Admin creates a valid dish; student receives 403 without a database write. |
| I1-UI-01 | UI | Submit empty and malformed login fields | Inline validation appears and login is not called. |
| I1-UI-02 | UI | Successful student, staff, and admin login | Each role reaches its expected landing page. |
| I1-UI-03 | UI | Select a menu category, inspect unavailable item and photo | Category request/filter is applied; unavailable item has no add-to-cart action; menu image renders with descriptive alt text. |
| I1-UI-04 | UI | Recover from menu request error | Error is visible; Retry reloads the menu. |
| I1-UI-05 | UI | Add menu item with HTTPS image URL | Admin form validates and sends the image URL with the menu item. |

### Increment 2 — Cart edits, totals, and confirmation

| ID | Type | Scenario | Expected result |
|---|---|---|---|
| I2-API-01 | API | Place an order with tampered client price and total | Server derives price from menu data, persists a Placed order and item snapshots in the transaction, and returns confirmation. |
| I2-API-02 | API | Place an order with invalid quantity | Request returns 400 and creates no order. |
| I2-API-03 | API | Staff attempts checkout; student orders unavailable item | Staff is denied and unavailable item returns conflict without order creation. |
| I2-UI-01 | UI | Increase/decrease quantity and remove cart item | Line and cart totals recalculate correctly. |
| I2-UI-02 | UI | Successful order response | Confirmation shows order number, status, and total; cart-clear action runs only after success. |
| I2-UI-03 | UI | Failed order then retry | Error is shown, cart remains intact, and retry uses the original idempotency key. |

### Increment 3 — Student status and staff dashboard

| ID | Type | Scenario | Expected result |
|---|---|---|---|
| I3-API-01 | API | List active staff queue | Active orders include student and item details and are ordered oldest first. |
| I3-API-02 | API | Advance Placed to Confirmed, then attempt a skip | One-step move succeeds; invalid transition returns 409. |
| I3-API-03 | API | Student status update and concurrent staff update | Student is denied; stale compare-and-set update returns 409. |
| I3-UI-01 | UI | Student order list refreshes from Placed to Ready | Updated status is visible and pickup message appears after polling. |
| I3-UI-02 | UI | Staff advances a listed order | Dashboard shows student/items, displays success notice, and presents the next status action. |

### Increment 4 — Records, validation, errors, and retry

| ID | Type | Scenario | Expected result |
|---|---|---|---|
| I4-API-01 | API | Records access, filters, revenue, and pagination | Existing `recordsApi.test.js` verifies staff/admin access, student denial, status/date validation, IST date boundaries, filtered revenue, sorting, and page results. |
| I4-API-02 | API | Record query schema and date boundaries | Existing validator tests cover valid/invalid status, dates, leap days, inverted ranges, page, and limit values. |
| I4-UI-01 | UI | View records and apply status/date filters | Matching records and revenue render; filters are sent to the API. |
| I4-UI-02 | UI | Reverse date range | Clear validation message appears and invalid range is not requested. |
| I4-UI-03 | UI | Records request fails then Retry | Error is visible; retry loads and displays records. |
| I4-UI-04 | UI | Navigate to the next records page | Page indicator and API page parameter advance together. |

The existing server regression suite also covers order status transition rules,
order input validation, and records query validation in their respective test
files.

## Reproduction

Run from the repository root:

```powershell
npm --prefix server test
npm --prefix client test
npm --prefix client run build
```

The client run reported 4 test files / 15 tests passed. The server run reported
7 test files / 57 tests passed. Automated suite commands do not connect to
MongoDB.
