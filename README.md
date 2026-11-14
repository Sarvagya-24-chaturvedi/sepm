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
cd server
npm test
npm run dev
```

In another terminal:

```bash
cd client
npm run build
npm run dev
```

MongoDB Atlas (or another MongoDB deployment configured as a replica set) is
required for the transaction used by order placement.

### Logging In (Increment 1)
Since Increment 1 does not include user registration/signup, use the seeded demo accounts defined in `server/src/seed.js` (and printed to the console when you run `npm run seed`) to log in as an `admin`, `staff`, or `student` user.
