# College Canteen Management System (MERN)

A responsive web application for a College Canteen Management System built with MongoDB Atlas, Express, React (Vite), Tailwind CSS, and Node.js.

---

## Increment 1 Scope (Login, Roles & Menu)

### Backend (`server/`)
- **Database Models**:
  - `User` (`name`, unique `email`, `passwordHash` excluded from queries/JSON by default, `role`: `student` | `staff` | `admin`, `createdAt`)
  - `MenuItem` (`name`, `category`, positive `price`, `isAvailable`, `timestamps`)
- **Database Seeding (`server/src/seed.js`)**:
  - Clears and seeds 4 demo accounts (1 admin, 1 staff, 2 students) and 10 menu items across 4 categories (Breakfast, Meals, Snacks, Beverages), including unavailable items.
- **Authentication & Role Access (`/api/auth`)**:
  - `POST /api/auth/login` — Zod validation, bcrypt password check, `httpOnly` + `SameSite=Lax` JWT cookie, generic `"Invalid credentials"` error, and IP-based login rate limiting.
  - `POST /api/auth/logout` — clears the auth cookie.
  - `GET /api/auth/me` — returns the logged-in user's `id`, `name`, and `role`.
  - Reusable middleware: `requireAuth` (`401`) and `requireRole(...roles)` (`403`), with a consistent `{ message, errors? }` error format.
- **Menu API (`/api/menu`)**:
  - `GET /api/menu` — accessible to any logged-in user; supports optional `?category=` filtering and returns the distinct `categories` list.
  - `POST /api/menu` — admin only; creates a menu item with Zod validation.
  - `PUT /api/menu/:id` — admin only; updates `name`, `category`, `price`, and optional `isAvailable` (`404` for invalid/unknown IDs).
  - `PATCH /api/menu/:id/availability` — admin only; toggles item availability (`404` for invalid/unknown IDs). No hard deletes.
- **Health Check**:
  - `GET /api/health`

### Frontend (`client/`)
- **Auth & Routing**:
  - Axios instance configured with `withCredentials: true` and `/api` base URL (proxied by Vite to `http://localhost:5000`).
  - `AuthContext` loading the current session from `/api/auth/me` on startup and exposing `login` and `logout`.
  - `ProtectedRoute` redirecting unauthenticated users to `/login` and showing a `403 Not Authorized` page for unauthorized roles.
  - Role-based post-login redirects (`student` -> `/menu`, `staff` -> `/staff`, `admin` -> `/admin/menu`).
- **Pages & Shared UI**:
  - **Login Page (`/login`)**: email/password form with client-side validation, inline errors, loading state, and server error display.
  - **Shared Layout & Navbar**: displays user name, role badge, logout button, and role-specific navigation links.
  - **Menu Page (`/menu`)**: responsive menu cards showing name, category, price in ₹, availability badge, category filter pills, greyed-out unavailable items, plus loading, empty, and error-with-retry states.
  - **Admin Menu Page (`/admin/menu`)**: table of all items with add/edit modal (matching server validation), enable/disable toggle, inline success/error feedback, and live list updates without page reload.
  - **Staff Dashboard (`/staff`)**: placeholder page for Increment 1 with a direct link to the menu.
  - **Reusable `ErrorRetry` component** for error and retry states.

> **Out of scope for Increment 1**: Cart, checkout/payments, order placement, and order status tracking will be added in future increments.

---

## Setup and Running Locally

### Prerequisites
- Node.js (v18 or higher)
- npm
- A MongoDB Atlas cluster and connection string

### 1. Configure Server Environment
1. Navigate to the `server` folder:
   ```bash
   cd server
   ```
2. Copy `.env.example` to `.env` (if not already present) and fill in your values:
   ```env
   PORT=5000
   CLIENT_URL=http://localhost:5173
   JWT_SECRET=<your_long_random_secret>
   MONGODB_URI=<your_mongodb_atlas_connection_string>
   ```
3. Install server dependencies:
   ```bash
   npm install
   ```
4. Seed the database with demo users and menu items:
   ```bash
   npm run seed
   ```
   The demo account credentials will be printed in the terminal output.

### 2. Install Client Dependencies
In a new terminal:
```bash
cd client
npm install
```

### 3. Run the Application
Start the backend server (from `server/`):
```bash
npm run dev
```

Start the frontend dev server (from `client/`):
```bash
npm run dev
```

Open `http://localhost:5173` in your browser. The Vite dev server proxies `/api` requests to `http://localhost:5000`.

## Increment 2: Cart and Order Placement

Students can add available menu items to a persistent browser cart, adjust quantities,
and place an order through `POST /api/orders`. Prices are always read again from
MongoDB before checkout; the client-supplied prices and total are never accepted.
Order creation stores an `Order` and its snapshot `OrderItem` documents in one
MongoDB transaction. The cart is cleared only after the API confirms success.

### Order data model

- `Order`: `orderNumber` (unique), `studentId` (reference to `User`), `totalAmount`,
  `status`, timestamps, and an optional unique `idempotencyKey`.
- `OrderItem`: `orderId`, `menuItemId`, `itemName`, `unitPrice`, `quantity`, and
  `subtotal`. Name and price are snapshots so later menu edits do not change history.
- Status values are `Placed`, `Confirmed`, `Preparing`, `Ready`, and `Completed`;
  Increment 2 creates orders with `Placed`. The latter values are reserved for the
  staff/status increment.

### Order API

All order routes use the existing cookie JWT. Students can access only their own
orders; staff and admins can use the future-compatible listing route.

- `POST /api/orders` (student): body
  `{ "items": [{ "menuItemId": "<menu id>", "quantity": 2 }] }`.
  An optional `Idempotency-Key` header makes retries safe.
- `GET /api/orders/my` (student): returns the authenticated student's orders.
- `GET /api/orders/:orderId` (student): returns one of that student's orders.
- `GET /api/orders` (staff/admin): returns up to 100 orders for the future staff
  dashboard.

Successful placement returns `{ success, message, data }`, where `data` contains
`order_id`, `status`, `total_amount`, `items`, and `created_at`.

### Running Increment 2

The existing setup commands remain unchanged:

```bash
cd servera
npm test
npm run dev
```

In another terminal:

```bash
cd client
npm run builda
npm run dev
```

MongoDB Atlas (or another MongoDB deployment configured as a replica set) is
required for the transaction used by order placement.
## Increment 3: Order Status and Staff Dashboard

Increment 3 introduces student order tracking and staff order management.
Students can view their placed orders, monitor the current preparation status,
and track progress through a five-stage order lifecycle. Staff members can view
incoming orders, filter orders by status, and update their progress through the
Staff Dashboard.

The implementation uses the existing Order and OrderItem models from
Increment 2. No new database models were required.

### Order status flow

`Placed` → `Confirmed` → `Preparing` → `Ready` → `Completed`

The server (`server/src/utils/orderStatus.js`) allows only one step forward at a time.
Skipping a step, moving backward, repeating a status, and changing a `Completed`
order are all rejected. The client has its own copy of the status list
(`client/src/utils/orderStatus.js`) for display only; the server enforces the rules.
The backend also implements a compare-and-set database update. Before changing
an order status, it checks whether the order still has the previously retrieved
status. This prevents concurrent staff updates from advancing an order using
outdated information. If another staff member has already updated the order,
the API returns `409 Conflict`.

### Staff Order API

These routes use the existing cookie JWT and are limited to staff and admin users.
A student calling them receives `403`.

- `GET /api/staff/orders` — returns active orders (every status except `Completed`),
  oldest first, up to 100. Each order includes the student's name and its items.
- `GET /api/staff/orders?status=<value>` — filters by `Placed`, `Confirmed`,
  `Preparing`, `Ready`, `Completed`, or `active`.
- `PATCH /api/staff/orders/:orderId/status` — body `{ "status": "Confirmed" }`.
  Moves the order to its next status. The update is applied only if the order is
  still in the status the server just read, so two staff members cannot advance
  the same order twice.
The staff dashboard retrieves the student's name and associated order items
along with each order. Active orders are sorted by creation time in ascending
order so staff can process older orders first. Completed orders are sorted by
their latest update time. The API returns a maximum of 100 orders per request.
Responses use `{ success, message?, data }`, where each order in `data` contains
`id`, `orderNumber`, `status`, `nextStatus`, `totalAmount`, `createdAt`,
`updatedAt`, `student`, and `items`.

| Code | Meaning |
|---|---|
| `200` | Status updated |
| `400` | Status is not one of the five valid values |
| `401` | Not logged in |
| `403` | Logged in without the staff or admin role |
| `404` | Invalid or unknown order ID |
| `409` | Invalid move (skipped, backward, or already `Completed`), or the order was changed by someone else |

### Frontend

- **My Orders (`/orders`, student)** — retrieves the authenticated student's order history using `GET /api/orders/my`. Displays order number, date, food items, quantities, total amount, current status badge and a five-stage progress bar.
- **Order Status Updates** — automatically refreshes student order information every 15 seconds so changes made by staff become visible without manually reloading the page. Displays a pickup notification when an order reaches `Ready`.
- **Staff Dashboard (`/staff`, staff)** — displays incoming orders in a table containing order number, student name, ordered items, quantities, total amount, creation time and current status.
- **Order Filtering** — provides filter tabs for Active, Placed, Confirmed, Preparing, Ready and Completed orders.
- **Status Management** — provides a `Mark <next status>` button for each order, allowing staff to advance orders through the permitted status sequence. Displays success and error messages after updates.
- **Automatic Dashboard Refresh** — refreshes the staff order list every 10 seconds and provides a manual refresh option.
- **`StatusBadge`** — reusable component for displaying the current order status.
- **`StaffDashboard.jsx`** replaces the earlier Increment 1 staff dashboard placeholder. `StaffDashboardPage.jsx` remains in the repository but is no longer used by the application router.
  
### Running Increment 3

The setup commands are unchanged. To try the new features, run `npm run seed`, then:

1. Log in as a student, add items to the cart, and place an order.
2. Open **My Orders** and check that the order shows `Placed`.
3. In another browser window, log in as staff, open the dashboard, and move the
   order through each status.
4. Check that the student's page updates within about 15 seconds.

### Testing

Unit tests for the order status transition rules are available in
`server/tests/orderStatus.test.js`.

The tests cover:

- Valid forward status transitions.
- Rejection of backward transitions.
- Rejection of skipped status stages.
- Rejection of repeated status values.
- Completed as the final order status.
- Handling of unknown status values.

Run the tests from the server directory:

```bash
cd server
npm test
```

- `/staff` is open to the staff role only, while the staff API also accepts admins.
- Updates reach the student by polling, not live push.
- Order cancellation is out of scope; it needs an SRS change request (Q3).
- The staff records page with date and status filters is planned for Increment 4.

### Logging In (Increment 1)
Since Increment 1 does not include user registration/signup, use the seeded demo accounts defined in `server/src/seed.js` (and printed to the console when you run `npm run seed`) to log in as an `admin`, `staff`, or `student` user.





## Increment 4: Order Records, Error Handling & Hardening

Increment 4 introduces a Staff/Admin Order Records page, allowing authorized users to view historical orders, filter records by status and date, and navigate through paginated results. This increment also improves error handling, retry functionality, and application reliability.

### Staff Order Records

A new Records page (`/records`) is available to staff and admin users.

**Records API**

`GET /api/staff/records`

- Accessible only to authenticated staff and admin users.
- Students are denied access with a 403 Forbidden response.
- Supports filtering orders by status.
- Supports start-date and end-date filtering.
- Returns order details, including order number, student information, ordered items, quantities, total amount, status, and timestamps.
- Displays the newest orders first.
- Supports pagination using `page` and `limit` query parameters.
- Returns the total number of matching orders and total revenue across all matching filtered orders.

**Frontend — Records Page (`/records`)**

- Displays historical order records in a responsive table and mobile-friendly layout.
- Provides filters for order status, start date, and end date.
- Includes options to clear filters and refresh records.
- Supports Previous and Next pagination.
- Displays the total matching order count and aggregated revenue.
- Provides loading, empty, error, and retry states.

### Error Handling and Retry Improvements

- Improved error messages and retry functionality across the application.
- Added clearer feedback for failed requests.
- Ensured retry buttons reset their loading state correctly.
- Preserved cart contents when order placement fails.
- Retained the same idempotency key when retrying an order request to prevent duplicate order creation.
- Cart contents are cleared only after successful order placement.

### Validation and Access Control

- Added Zod-based validation for order record filters.
- Validates date inputs, including invalid calendar dates and leap years.
- Date-only filters use the application’s IST timezone (`+05:30`).
- Maintains role-based frontend route protection and backend authorization.
- Staff and admin users can access Records, while students cannot.

### Testing

Increment 4 includes automated tests for record filter validation and the Records API.

The tests cover:

- Valid and invalid date filters.
- IST date boundaries.
- Status and date filtering.
- Pagination.
- Revenue aggregation.
- Role-based access control.

Run backend tests from the server directory:

```bash
cd server
npm test
```

Build the frontend from the client directory:

```bash
cd client
npm run build
```

**Verification:** Backend test suite — 48 tests passed. Frontend production build completed successfully during Increment 4 verification.

