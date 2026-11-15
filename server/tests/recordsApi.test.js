const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-jest';

jest.mock('../src/models/Order');
jest.mock('../src/models/OrderItem');

const Order = require('../src/models/Order');
const OrderItem = require('../src/models/OrderItem');
const staffRecordRoutes = require('../src/routes/staffRecordRoutes');

function makeToken(user) {
  return jwt.sign(
    {
      sub: user.id || '507f1f77bcf86cd799439011',
      name: user.name || 'Test User',
      role: user.role,
    },
    process.env.JWT_SECRET
  );
}

function dispatch(options = {}) {
  return new Promise((resolve, reject) => {
    const req = {
      method: options.method || 'GET',
      url: options.url || '/',
      query: options.query || {},
      cookies: options.cookies || {},
      headers: options.headers || {},
    };

    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        resolve({ status: this.statusCode, body: this.body });
        return this;
      },
      send(data) {
        this.body = data;
        resolve({ status: this.statusCode, body: this.body });
        return this;
      },
    };

    staffRecordRoutes.handle(req, res, (err) => {
      if (err) reject(err);
      else resolve({ status: res.statusCode, body: res.body });
    });
  });
}

describe('GET /api/staff/records', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Order.aggregate = jest.fn().mockResolvedValue([{ _id: null, totalRevenue: 120 }]);
  });

  describe('Authentication and Access Control (FR-16, FR-17)', () => {
    test('rejects unauthenticated requests with 401', async () => {
      const res = await dispatch();
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Authentication required/i);
    });

    test('rejects student role with 403 Forbidden', async () => {
      const token = makeToken({ role: 'student', name: 'Alice Student' });
      const res = await dispatch({
        cookies: { token },
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Forbidden/i);
    });

    test('allows staff role with 200 OK and returns totalRevenue across all orders', async () => {
      const mockOrders = [
        {
          _id: '6735a1b2c3d4e5f6a7b8c9d0',
          orderNumber: 'ORD-1001',
          status: 'Completed',
          totalAmount: 120,
          createdAt: new Date('2026-11-15T10:00:00Z'),
          updatedAt: new Date('2026-11-15T10:30:00Z'),
          studentId: { _id: '507f1f77bcf86cd799439011', name: 'Alice Student', email: 'alice@canteen.edu' },
        },
      ];

      const mockPopulate = jest.fn().mockResolvedValue(mockOrders);
      const mockLimit = jest.fn().mockReturnValue({ populate: mockPopulate });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });

      Order.find.mockReturnValue({ sort: mockSort });
      Order.countDocuments.mockResolvedValue(1);
      Order.aggregate.mockResolvedValue([{ _id: null, totalRevenue: 120 }]);

      OrderItem.find.mockResolvedValue([
        {
          _id: 'item1',
          orderId: '6735a1b2c3d4e5f6a7b8c9d0',
          itemName: 'Masala Dosa',
          quantity: 2,
          unitPrice: 60,
          subtotal: 120,
        },
      ]);

      const token = makeToken({ role: 'staff', name: 'Bob Staff' });
      const res = await dispatch({
        cookies: { token },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.orderNumber || res.body.data[0].orderNumber).toBe('ORD-1001');
      expect(res.body.data[0].studentName).toBe('Alice Student');
      expect(res.body.totalRevenue).toBe(120);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].items).toHaveLength(1);
      expect(res.body.data[0].items[0].name).toBe('Masala Dosa');
    });

    test('allows admin role with 200 OK', async () => {
      const mockPopulate = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ populate: mockPopulate });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });

      Order.find.mockReturnValue({ sort: mockSort });
      Order.countDocuments.mockResolvedValue(0);
      Order.aggregate.mockResolvedValue([]);
      OrderItem.find.mockResolvedValue([]);

      const token = makeToken({ role: 'admin', name: 'Charlie Admin' });
      const res = await dispatch({
        cookies: { token },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
      expect(res.body.totalRevenue).toBe(0);
    });
  });

  describe('Query parameter validation (FR-15)', () => {
    const staffCookies = { token: makeToken({ role: 'staff' }) };

    test('rejects invalid status filter with 400', async () => {
      const res = await dispatch({
        cookies: staffCookies,
        query: { status: 'UnknownStatus' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid status filter/);
    });

    test('rejects invalid startDate with 400', async () => {
      const res = await dispatch({
        cookies: staffCookies,
        query: { startDate: 'not-a-date' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid startDate/);
    });

    test('rejects invalid endDate with 400', async () => {
      const res = await dispatch({
        cookies: staffCookies,
        query: { endDate: 'invalid-date' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Invalid endDate/);
    });

    test('rejects when startDate is after endDate with 400', async () => {
      const res = await dispatch({
        cookies: staffCookies,
        query: { startDate: '2026-11-20', endDate: '2026-11-10' },
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Start date cannot be after end date');
    });
  });

  describe('Filtering, Sorting and Revenue Calculation (FR-15, Bug 1, Bug 2)', () => {
    const staffCookies = { token: makeToken({ role: 'staff' }) };

    test('queries all statuses when status is "All" or omitted', async () => {
      const mockPopulate = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ populate: mockPopulate });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });

      Order.find.mockReturnValue({ sort: mockSort });
      Order.countDocuments.mockResolvedValue(0);
      Order.aggregate.mockResolvedValue([]);
      OrderItem.find.mockResolvedValue([]);

      await dispatch({
        cookies: staffCookies,
        query: { status: 'All' },
      });

      expect(Order.find).toHaveBeenCalledWith({});
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
    });

    test('queries specific status when filtered', async () => {
      const mockPopulate = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ populate: mockPopulate });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });

      Order.find.mockReturnValue({ sort: mockSort });
      Order.countDocuments.mockResolvedValue(0);
      Order.aggregate.mockResolvedValue([]);
      OrderItem.find.mockResolvedValue([]);

      await dispatch({
        cookies: staffCookies,
        query: { status: 'Preparing' },
      });

      expect(Order.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'Preparing' })
      );
      expect(Order.aggregate).toHaveBeenCalledWith([
        { $match: { status: 'Preparing' } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
      ]);
    });

    test('queries IST date range (+05:30) when startDate and endDate are provided (Bug 1)', async () => {
      const mockPopulate = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ populate: mockPopulate });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });

      Order.find.mockReturnValue({ sort: mockSort });
      Order.countDocuments.mockResolvedValue(0);
      Order.aggregate.mockResolvedValue([]);
      OrderItem.find.mockResolvedValue([]);

      await dispatch({
        cookies: staffCookies,
        query: { startDate: '2026-11-01', endDate: '2026-11-15' },
      });

      expect(Order.find).toHaveBeenCalledWith(
        expect.objectContaining({
          createdAt: {
            $gte: new Date('2026-11-01T00:00:00.000+05:30'),
            $lte: new Date('2026-11-15T23:59:59.999+05:30'),
          },
        })
      );
    });

    test('supports pagination with page and limit parameters, returning overall total and totalRevenue (Bug 2)', async () => {
      const mockPopulate = jest.fn().mockResolvedValue([]);
      const mockLimit = jest.fn().mockReturnValue({ populate: mockPopulate });
      const mockSkip = jest.fn().mockReturnValue({ limit: mockLimit });
      const mockSort = jest.fn().mockReturnValue({ skip: mockSkip });

      Order.find.mockReturnValue({ sort: mockSort });
      Order.countDocuments.mockResolvedValue(250);
      Order.aggregate.mockResolvedValue([{ _id: null, totalRevenue: 15400.5 }]);
      OrderItem.find.mockResolvedValue([]);

      const res = await dispatch({
        cookies: staffCookies,
        query: { page: '2', limit: '100' },
      });

      expect(mockSkip).toHaveBeenCalledWith(100);
      expect(mockLimit).toHaveBeenCalledWith(100);
      expect(res.body.page).toBe(2);
      expect(res.body.limit).toBe(100);
      expect(res.body.total).toBe(250);
      expect(res.body.totalRevenue).toBe(15400.5);
    });
  });
});
