/**
 * M6 Tester Verification Suite - Sarvagya Chaturvedi
 * Role: Tester (security / acceptance)
 * Tests role access, data integrity, invalid inputs, response times, and AC-01 to AC-12.
 */

const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const User = require('../src/models/User');
const MenuItem = require('../src/models/MenuItem');
const Order = require('../src/models/Order');
const OrderItem = require('../src/models/OrderItem');

const BASE_URL = 'http://localhost:5001/api';

const results = [];

function logTest(id, name, category, passed, details = '', responseTimeMs = null) {
  results.push({ id, name, category, passed, details, responseTimeMs });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  const timeStr = responseTimeMs !== null ? ` (${responseTimeMs}ms)` : '';
  console.log(`${icon} [${id}] ${name}${timeStr}: ${details}`);
}

async function request(path, options = {}) {
  const start = Date.now();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const duration = Date.now() - start;
  let json = null;
  const cookieHeader = res.headers.get('set-cookie');
  try {
    json = await res.json();
  } catch (e) {
    json = null;
  }
  return { status: res.status, headers: res.headers, cookies: cookieHeader, data: json, duration };
}

function extractCookie(cookieHeader) {
  if (!cookieHeader) return '';
  const match = cookieHeader.match(/token=([^;]+)/);
  return match ? `token=${match[1]}` : '';
}

async function runAll() {
  console.log('================================================================');
  console.log('🚀 EXECUTING M6 TESTER SECURITY, DATA INTEGRITY & ACCEPTANCE SUITE');
  console.log('Tester: Sarvagya Chaturvedi (M6)');
  console.log('Target: Live College Canteen System (http://localhost:5001)');
  console.log('================================================================\n');

  // Connect to DB for direct integrity verifications
  await mongoose.connect(process.env.MONGODB_URI);

  // -------------------------------------------------------------
  // TEST SECTION 1: AUTHENTICATION, PASSWORD HASHING & COOKIE SECURITY
  // -------------------------------------------------------------
  console.log('\n--- SECTION 1: Authentication & Credential Security (FR-01, FR-02, SEC-01) ---');
  
  // 1.1 Hashed Passwords in DB
  const adminUser = await User.findOne({ email: 'admin@canteen.edu' }).select('+passwordHash');
  const isHashBcrypt = adminUser && adminUser.passwordHash && adminUser.passwordHash.startsWith('$2b$');
  logTest(
    'SEC-01',
    'Passwords stored using strong bcrypt hash (never plaintext)',
    'Security',
    isHashBcrypt,
    `Hash prefix: ${adminUser.passwordHash.slice(0, 7)}..., Length: ${adminUser.passwordHash.length}`
  );

  // 1.2 Password hash excluded from standard query
  const userSafe = await User.findOne({ email: 'admin@canteen.edu' });
  const hashExcluded = userSafe.passwordHash === undefined;
  logTest(
    'SEC-02',
    'Password hash excluded by default from User model queries',
    'Security',
    hashExcluded,
    `passwordHash in default query: ${userSafe.passwordHash}`
  );

  // 1.3 Login with correct credentials & check cookie flags
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@canteen.edu', password: 'AdminPassword123!' }),
  });
  const cookieFlags = loginRes.cookies || '';
  const isHttpOnly = cookieFlags.toLowerCase().includes('httponly');
  const isSameSiteLax = cookieFlags.toLowerCase().includes('samesite=lax');
  const adminCookie = extractCookie(loginRes.cookies);

  logTest(
    'SEC-03',
    'JWT auth cookie is HttpOnly and SameSite=Lax',
    'Security',
    loginRes.status === 200 && isHttpOnly && isSameSiteLax,
    `Status: ${loginRes.status}, HttpOnly: ${isHttpOnly}, SameSite: Lax present`,
    loginRes.duration
  );

  // 1.4 Invalid credentials return generic 401 error
  const badLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@canteen.edu', password: 'WrongPassword999!' }),
  });
  logTest(
    'SEC-04',
    'Invalid password returns 401 with generic error message',
    'Security',
    badLogin.status === 401 && badLogin.data?.message === 'Invalid credentials',
    `Status: ${badLogin.status}, Message: "${badLogin.data?.message}"`,
    badLogin.duration
  );

  // 1.5 Non-existent user returns same generic 401 (prevent user enumeration)
  const nonExistLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'fakeuser9999@canteen.edu', password: 'AnyPassword123!' }),
  });
  logTest(
    'SEC-05',
    'Non-existent email returns identical 401 generic error (no enumeration)',
    'Security',
    nonExistLogin.status === 401 && nonExistLogin.data?.message === 'Invalid credentials',
    `Status: ${nonExistLogin.status}, Message: "${nonExistLogin.data?.message}"`,
    nonExistLogin.duration
  );

  // 1.6 Malformed email input rejected by Zod validator
  const malformedLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'notanemail', password: 'Short' }),
  });
  logTest(
    'SEC-06',
    'Malformed email and short password rejected with 400',
    'Input Validation',
    malformedLogin.status === 400,
    `Status: ${malformedLogin.status}`
  );

  // -------------------------------------------------------------
  // TEST SECTION 2: ROLE-BASED ACCESS CONTROL (RBAC) (FR-17, AC-09)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 2: Role-Based Access Control (RBAC) (FR-17, AC-09, AC-11) ---');

  // Login accounts for each role
  const studentLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'rohan@canteen.edu', password: 'StudentPassword123!' }),
  });
  const studentCookie = extractCookie(studentLogin.cookies);

  const student2Login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'ananya@canteen.edu', password: 'StudentPassword123!' }),
  });
  const student2Cookie = extractCookie(student2Login.cookies);

  const staffLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'staff@canteen.edu', password: 'StaffPassword123!' }),
  });
  const staffCookie = extractCookie(staffLogin.cookies);

  // 2.1 Unauthenticated requests blocked with 401
  const unauthOrders = await request('/orders');
  const unauthStaff = await request('/staff/orders');
  const unauthRecords = await request('/staff/records');
  logTest(
    'RBAC-01',
    'Unauthenticated requests to protected endpoints return 401 Unauthorized',
    'Security',
    unauthOrders.status === 401 && unauthStaff.status === 401 && unauthRecords.status === 401,
    `orders: ${unauthOrders.status}, staff: ${unauthStaff.status}, records: ${unauthRecords.status}`
  );

  // 2.2 Student blocked from staff queue (403 Forbidden)
  const studentAtStaff = await request('/staff/orders', {
    headers: { Cookie: studentCookie },
  });
  logTest(
    'RBAC-02',
    'Student forbidden from accessing Staff Orders queue (/api/staff/orders)',
    'Security',
    studentAtStaff.status === 403,
    `Status: ${studentAtStaff.status}, Message: "${studentAtStaff.data?.message}"`
  );

  // 2.3 Student blocked from records page (403 Forbidden)
  const studentAtRecords = await request('/staff/records', {
    headers: { Cookie: studentCookie },
  });
  logTest(
    'RBAC-03',
    'Student forbidden from accessing Records & Revenue API (/api/staff/records)',
    'Security',
    studentAtRecords.status === 403,
    `Status: ${studentAtRecords.status}, Message: "${studentAtRecords.data?.message}"`
  );

  // 2.4 Student blocked from modifying menu (403 Forbidden)
  const studentMenuPost = await request('/menu', {
    method: 'POST',
    headers: { Cookie: studentCookie },
    body: JSON.stringify({ name: 'Hacker Dosa', category: 'Breakfast', price: 10, isAvailable: true }),
  });
  logTest(
    'RBAC-04',
    'Student forbidden from creating menu items (POST /api/menu)',
    'Security',
    studentMenuPost.status === 403,
    `Status: ${studentMenuPost.status}`
  );

  // 2.5 Staff blocked from creating or editing menu items (Admin only)
  const staffMenuPost = await request('/menu', {
    method: 'POST',
    headers: { Cookie: staffCookie },
    body: JSON.stringify({ name: 'Staff Dish', category: 'Meals', price: 90, isAvailable: true }),
  });
  logTest(
    'RBAC-05',
    'Staff forbidden from modifying menu (Admin-only restricted)',
    'Security',
    staffMenuPost.status === 403,
    `Status: ${staffMenuPost.status}`
  );

  // 2.6 Admin can access menu management and records
  const adminRecords = await request('/staff/records', {
    headers: { Cookie: adminCookie },
  });
  logTest(
    'RBAC-06',
    'Admin successfully accesses records analytics endpoint',
    'Security',
    adminRecords.status === 200,
    `Status: ${adminRecords.status}, Total records: ${adminRecords.data?.total}`
  );

  // -------------------------------------------------------------
  // TEST SECTION 3: DATA INTEGRITY & FINANCIAL ACCURACY (FR-04, FR-18, FR-19, AC-03)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 3: Data Integrity, Pricing & Transactions (FR-04, FR-18, FR-19, AC-03) ---');

  // Find a valid menu item
  const samosa = await MenuItem.findOne({ name: 'Samosa (2 pcs)', isAvailable: true });
  const dosa = await MenuItem.findOne({ name: 'Masala Dosa', isAvailable: true });

  // 3.1 Server ignores tampered client prices
  const tamperedOrderRes = await request('/orders', {
    method: 'POST',
    headers: { Cookie: studentCookie },
    body: JSON.stringify({
      items: [{ menuItemId: samosa._id.toString(), quantity: 2, price: 1, unitPrice: 0.01 }],
      totalAmount: 0.02,
    }),
  });
  const expectedTotal = Math.round(samosa.price * 2 * 100) / 100;
  const actualTotal = tamperedOrderRes.data?.data?.total_amount;
  logTest(
    'INT-01',
    'Server calculates order prices strictly from DB (tampered client prices ignored)',
    'Data Integrity',
    tamperedOrderRes.status === 201 && actualTotal === expectedTotal,
    `Actual: ₹${actualTotal}, Expected DB calculation: ₹${expectedTotal}`
  );
  const order1Id = tamperedOrderRes.data?.data?.id;

  // 3.2 OrderItem historical snapshot verification
  const orderItemDoc = await OrderItem.findOne({ orderId: order1Id });
  const snapshotMatches = orderItemDoc && orderItemDoc.itemName === samosa.name && orderItemDoc.unitPrice === samosa.price;
  logTest(
    'INT-02',
    'OrderItem stores historical snapshot of name and unit price',
    'Data Integrity',
    snapshotMatches,
    `Snapshot Name: "${orderItemDoc?.itemName}", Price: ₹${orderItemDoc?.unitPrice}`
  );

  // 3.3 Idempotency protection with Idempotency-Key
  const testIdempotencyKey = `test-idem-${Date.now()}`;
  const firstPlacement = await request('/orders', {
    method: 'POST',
    headers: { Cookie: studentCookie, 'Idempotency-Key': testIdempotencyKey },
    body: JSON.stringify({ items: [{ menuItemId: dosa._id.toString(), quantity: 1 }] }),
  });
  const secondPlacement = await request('/orders', {
    method: 'POST',
    headers: { Cookie: studentCookie, 'Idempotency-Key': testIdempotencyKey },
    body: JSON.stringify({ items: [{ menuItemId: dosa._id.toString(), quantity: 1 }] }),
  });
  const sameOrderReturned = firstPlacement.data?.data?.order_id === secondPlacement.data?.data?.order_id;
  const duplicateOrdersCount = await Order.countDocuments({ idempotencyKey: testIdempotencyKey });
  logTest(
    'INT-03',
    'Idempotency-Key prevents duplicate order creation on repeat submission',
    'Data Integrity',
    firstPlacement.status === 201 && secondPlacement.status === 200 && sameOrderReturned && duplicateOrdersCount === 1,
    `First OrderID: ${firstPlacement.data?.data?.order_id}, Repeat OrderID: ${secondPlacement.data?.data?.order_id}, DB Count: ${duplicateOrdersCount}`
  );
  const createdOrderId = firstPlacement.data?.data?.id;

  // 3.4 Student cross-tenant isolation: Student B cannot read Student A's order
  const crossTenantOrderGet = await request(`/orders/${createdOrderId}`, {
    headers: { Cookie: student2Cookie },
  });
  logTest(
    'INT-04',
    'Student B cannot view Student A order by ID (cross-tenant isolation: 404)',
    'Security',
    crossTenantOrderGet.status === 404,
    `Status: ${crossTenantOrderGet.status}`
  );

  // -------------------------------------------------------------
  // TEST SECTION 4: INVALID INPUTS & BOUNDARY TESTING (FR-16, AC-02, AC-07, AC-10)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 4: Invalid Inputs & Boundary Testing (FR-16, AC-02, AC-07, AC-10) ---');

  // 4.1 Negative quantity
  const negQtyOrder = await request('/orders', {
    method: 'POST',
    headers: { Cookie: studentCookie },
    body: JSON.stringify({ items: [{ menuItemId: dosa._id.toString(), quantity: -2 }] }),
  });
  logTest(
    'INP-01',
    'Negative quantity in order items rejected with 400 Bad Request',
    'Input Validation',
    negQtyOrder.status === 400,
    `Status: ${negQtyOrder.status}`
  );

  // 4.2 Floating point quantity
  const floatQtyOrder = await request('/orders', {
    method: 'POST',
    headers: { Cookie: studentCookie },
    body: JSON.stringify({ items: [{ menuItemId: dosa._id.toString(), quantity: 1.75 }] }),
  });
  logTest(
    'INP-02',
    'Non-integer (decimal) quantity rejected with 400 Bad Request',
    'Input Validation',
    floatQtyOrder.status === 400,
    `Status: ${floatQtyOrder.status}`
  );

  // 4.3 Duplicate menuItemId in single order array rejected
  const dupItemOrder = await request('/orders', {
    method: 'POST',
    headers: { Cookie: studentCookie },
    body: JSON.stringify({
      items: [
        { menuItemId: dosa._id.toString(), quantity: 1 },
        { menuItemId: dosa._id.toString(), quantity: 2 },
      ],
    }),
  });
  logTest(
    'INP-03',
    'Duplicate menuItemId in single order rejected by superRefine validator',
    'Input Validation',
    dupItemOrder.status === 400,
    `Status: ${dupItemOrder.status}`
  );

  // 4.4 Non-existent menuItemId rejected
  const fakeItemOrder = await request('/orders', {
    method: 'POST',
    headers: { Cookie: studentCookie },
    body: JSON.stringify({ items: [{ menuItemId: '507f1f77bcf86cd799439099', quantity: 1 }] }),
  });
  logTest(
    'INP-04',
    'Non-existent menu item ID rejected with 409 Conflict',
    'Input Validation',
    fakeItemOrder.status === 409,
    `Status: ${fakeItemOrder.status}, Message: "${fakeItemOrder.data?.message}"`
  );

  // 4.5 Ordering unavailable item rejected
  const unavailItem = await MenuItem.findOne({ isAvailable: false });
  const orderUnavail = await request('/orders', {
    method: 'POST',
    headers: { Cookie: studentCookie },
    body: JSON.stringify({ items: [{ menuItemId: unavailItem._id.toString(), quantity: 1 }] }),
  });
  logTest(
    'INP-05',
    'Ordering unavailable menu item rejected with 409 Conflict',
    'Business Rules',
    orderUnavail.status === 409,
    `Status: ${orderUnavail.status}, Item: "${unavailItem?.name}"`
  );

  // 4.6 Status Transition: Valid sequence (Placed -> Confirmed)
  const validStatusChange = await request(`/staff/orders/${createdOrderId}/status`, {
    method: 'PATCH',
    headers: { Cookie: staffCookie },
    body: JSON.stringify({ status: 'Confirmed' }),
  });
  logTest(
    'STS-01',
    'Staff successfully advances order status: Placed -> Confirmed',
    'Order Status',
    validStatusChange.status === 200 && validStatusChange.data?.data?.status === 'Confirmed',
    `Status: ${validStatusChange.status}, New status: ${validStatusChange.data?.data?.status}`
  );

  // 4.7 Status Transition: Invalid backward transition rejected (Confirmed -> Placed)
  const backwardStatusChange = await request(`/staff/orders/${createdOrderId}/status`, {
    method: 'PATCH',
    headers: { Cookie: staffCookie },
    body: JSON.stringify({ status: 'Placed' }),
  });
  logTest(
    'STS-02',
    'Backward status transition (Confirmed -> Placed) rejected with 409 Conflict',
    'Order Status',
    backwardStatusChange.status === 409,
    `Status: ${backwardStatusChange.status}, Message: "${backwardStatusChange.data?.message}"`
  );

  // 4.8 Status Transition: Invalid skip transition rejected (Confirmed -> Ready without Preparing)
  const skipStatusChange = await request(`/staff/orders/${createdOrderId}/status`, {
    method: 'PATCH',
    headers: { Cookie: staffCookie },
    body: JSON.stringify({ status: 'Ready' }),
  });
  logTest(
    'STS-03',
    'Skipping status transition (Confirmed -> Ready) rejected with 409 Conflict',
    'Order Status',
    skipStatusChange.status === 409,
    `Status: ${skipStatusChange.status}, Message: "${skipStatusChange.data?.message}"`
  );

  // 4.9 Student cannot change order status
  const studentChangeStatus = await request(`/staff/orders/${createdOrderId}/status`, {
    method: 'PATCH',
    headers: { Cookie: studentCookie },
    body: JSON.stringify({ status: 'Preparing' }),
  });
  logTest(
    'STS-04',
    'Student blocked from changing order status (403 Forbidden)',
    'Security',
    studentChangeStatus.status === 403,
    `Status: ${studentChangeStatus.status}`
  );

  // 4.10 Complete the transition to Preparing -> Ready -> Completed
  await request(`/staff/orders/${createdOrderId}/status`, {
    method: 'PATCH',
    headers: { Cookie: staffCookie },
    body: JSON.stringify({ status: 'Preparing' }),
  });
  await request(`/staff/orders/${createdOrderId}/status`, {
    method: 'PATCH',
    headers: { Cookie: staffCookie },
    body: JSON.stringify({ status: 'Ready' }),
  });
  const completeRes = await request(`/staff/orders/${createdOrderId}/status`, {
    method: 'PATCH',
    headers: { Cookie: staffCookie },
    body: JSON.stringify({ status: 'Completed' }),
  });
  logTest(
    'STS-05',
    'Sequential transition through entire lifecycle ends in Completed status',
    'Order Status',
    completeRes.status === 200 && completeRes.data?.data?.status === 'Completed',
    `Final Status: ${completeRes.data?.data?.status}`
  );

  // 4.11 Changing a Completed order is rejected
  const afterCompleteChange = await request(`/staff/orders/${createdOrderId}/status`, {
    method: 'PATCH',
    headers: { Cookie: staffCookie },
    body: JSON.stringify({ status: 'Ready' }),
  });
  logTest(
    'STS-06',
    'Modifying an already Completed order rejected with 409 Conflict',
    'Order Status',
    afterCompleteChange.status === 409,
    `Status: ${afterCompleteChange.status}, Message: "${afterCompleteChange.data?.message}"`
  );

  // 4.12 Date range validation: startDate > endDate rejected
  const badDateRange = await request('/staff/records?startDate=2026-11-20&endDate=2026-11-10', {
    headers: { Cookie: staffCookie },
  });
  logTest(
    'REC-01',
    'Records query with startDate > endDate rejected with 400 Bad Request',
    'Input Validation',
    badDateRange.status === 400,
    `Status: ${badDateRange.status}, Message: "${badDateRange.data?.message}"`
  );

  // 4.13 Invalid date string (e.g. Feb 31 calendar rollover) rejected
  const badCalDate = await request('/staff/records?startDate=2026-02-31', {
    headers: { Cookie: staffCookie },
  });
  logTest(
    'REC-02',
    'Non-existent calendar date (2026-02-31) rejected with 400 Bad Request',
    'Input Validation',
    badCalDate.status === 400,
    `Status: ${badCalDate.status}, Message: "${badCalDate.data?.message}"`
  );

  // 4.14 Filter records by status = Completed
  const filterCompleted = await request('/staff/records?status=Completed', {
    headers: { Cookie: staffCookie },
  });
  const allAreCompleted = filterCompleted.data?.data?.every((o) => o.status === 'Completed');
  logTest(
    'REC-03',
    'Records query filtered by status=Completed returns only Completed orders',
    'Acceptance Criteria',
    filterCompleted.status === 200 && allAreCompleted,
    `Status: ${filterCompleted.status}, Count: ${filterCompleted.data?.count}, TotalRevenue: ₹${filterCompleted.data?.totalRevenue}`,
    filterCompleted.duration
  );

  // -------------------------------------------------------------
  // TEST SECTION 5: PERFORMANCE & RESPONSE TIME VERIFICATION (NFR)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 5: Performance & Response Time Checks (NFRs) ---');

  const perfEndpoints = [
    { name: 'GET /api/menu', path: '/menu', headers: { Cookie: studentCookie } },
    { name: 'GET /api/orders/my', path: '/orders/my', headers: { Cookie: studentCookie } },
    { name: 'GET /api/staff/orders', path: '/staff/orders', headers: { Cookie: staffCookie } },
    { name: 'GET /api/staff/records', path: '/staff/records', headers: { Cookie: staffCookie } },
  ];

  for (const ep of perfEndpoints) {
    const res = await request(ep.path, { headers: ep.headers });
    const isFast = res.duration < 500;
    logTest(
      `PERF-${ep.name.split(' ')[1].replace(/\//g, '_')}`,
      `Response time of ${ep.name} < 500ms`,
      'Performance',
      isFast,
      `Duration: ${res.duration}ms (Threshold: 500ms)`,
      res.duration
    );
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('📊 EXECUTION SUMMARY');
  console.log('================================================================');
  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;
  console.log(`Total Test Cases Executed: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Pass Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  await mongoose.connection.close();
  return results;
}

runAll().then(() => process.exit(0)).catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
