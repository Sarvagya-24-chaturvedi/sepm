# College Canteen Management System — User Guide

This guide covers the student, staff, and admin workflows across Increments 1–4.
The application does not include sign-up: use the demo accounts created by the
seed script or accounts supplied by your administrator.

## Sign in

1. Start the server and client using the setup instructions in the
   [project README](../README.md).
2. Open `http://localhost:5173`.
3. Enter your college canteen email and password. The seed command prints the
   demo credentials when it completes.
4. You will be sent to the screen for your role:
   - Student: **Menu**
   - Staff: **Staff Dashboard**
   - Admin: **Admin Menu**
5. Use **Logout** in the top navigation to end your session.

An invalid or incomplete login shows a message on the sign-in form. Check the
email and password and try again.

## Student: browse, order, and track

### Browse the menu (Increment 1)

1. Open **Menu**.
2. Choose **All** or a category such as Breakfast, Meals, Snacks, or Beverages.
3. Available dishes have an **Available** label and an **Add to cart** button.
   Unavailable dishes are labelled and cannot be added.

### Edit the cart and place an order (Increment 2)

1. Add one or more available dishes, then open **Cart**.
2. Use **+** and **−** to change quantities, or **Remove** to delete a dish.
   The line amounts and total update automatically.
3. Select **Place Order**. A successful response displays the order number,
   status, date, and total.
4. If the request fails, the cart is retained. Read the error and select
   **Retry Order** when ready. A retry reuses the same request key to avoid
   creating a duplicate order.

Order placement requires a reachable server and a MongoDB deployment that
supports transactions (for example, a replica set).

### View order status (Increment 3)

1. Open **My Orders**.
2. Check each order’s status and progress through Placed, Confirmed, Preparing,
   Ready, and Completed.
3. The list refreshes automatically about every 15 seconds. When an order is
   marked **Ready**, the page displays a pickup message.

## Staff: prepare orders (Increment 3)

1. Open **Staff Dashboard** to view the active order queue.
2. Use the status tabs to filter the queue, or **Refresh** to reload it.
3. Select **Mark <next status>** to advance an order by one step. The dashboard
   displays a success or error notice and refreshes the order.
4. Orders refresh automatically about every 10 seconds. Completed orders no
   longer appear under **Active**; select **Completed** to view them.

Status changes must follow the displayed lifecycle one step at a time.

## Staff and admin: order records (Increment 4)

1. Open **Records** from the navigation.
2. Filter by status and/or start and end dates. Date ranges use the application’s
   IST calendar-day boundaries.
3. Review the matching order count, revenue, and paginated order details.
4. Use **Previous** and **Next** to navigate pages. **Clear Filters** resets the
   filters; **Refresh Records** reloads the current view.
5. If loading fails, use **Retry**. The error appears above the records and the
   current filter values remain available.

Only staff and admin roles can access Records. Students cannot access the staff
dashboard or the records page.

## Admin: manage the menu (Increment 1)

Admins can open **Admin Menu** to add and edit dishes and toggle availability.
Menu items are disabled/enabled rather than deleted, so historical order items
remain intact.

## Running the automated test suites

From the repository root:

```powershell
npm --prefix server test
npm --prefix client test
npm --prefix client run build
```

The automated API and UI suites use mocked persistence/API responses and do not
require a running MongoDB instance. See the [test report](./TEST_REPORT.md) for
covered scenarios and the latest run results.
