process.env.JWT_SECRET = 'increment-three-functional-test-secret';

jest.mock('../src/models/Order');
jest.mock('../src/models/OrderItem');

const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const Order = require('../src/models/Order');
const OrderItem = require('../src/models/OrderItem');

const orderId = '507f1f77bcf86cd799439088';
const staffCookie = `token=${jwt.sign(
  { sub: '507f1f77bcf86cd799439012', name: 'Staff', role: 'staff' },
  process.env.JWT_SECRET
)}`;
const studentCookie = `token=${jwt.sign(
  { sub: '507f1f77bcf86cd799439011', name: 'Student', role: 'student' },
  process.env.JWT_SECRET
)}`;

describe('Increment 3 API: staff order dashboard and status updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lists active orders with student and item details, oldest first', async () => {
    const orders = [{
      _id: orderId,
      orderNumber: 'ORD-3001',
      status: 'Placed',
      totalAmount: 50,
      createdAt: new Date('2026-11-18T10:00:00.000Z'),
      studentId: { _id: 'student-id', name: 'Asha Student' },
    }];
    const populate = jest.fn().mockResolvedValue(orders);
    const limit = jest.fn().mockReturnValue({ populate });
    const sort = jest.fn().mockReturnValue({ limit });
    Order.find.mockReturnValue({ sort });
    OrderItem.find.mockResolvedValue([
      { orderId, itemName: 'Samosa', quantity: 2, subtotal: 50 },
    ]);

    const response = await request(app)
      .get('/api/staff/orders')
      .set('Cookie', staffCookie);

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      orderNumber: 'ORD-3001',
      status: 'Placed',
      nextStatus: 'Confirmed',
      student: { name: 'Asha Student' },
      items: [{ name: 'Samosa', quantity: 2, subtotal: 50 }],
    });
    expect(Order.find).toHaveBeenCalledWith({ status: { $ne: 'Completed' } });
    expect(sort).toHaveBeenCalledWith({ createdAt: 1 });
  });

  test('advances staff orders by exactly one step and rejects skips', async () => {
    const order = { _id: orderId, status: 'Placed' };
    const updated = {
      _id: orderId,
      orderNumber: 'ORD-3002',
      status: 'Confirmed',
      totalAmount: 25,
      studentId: { _id: 'student-id', name: 'Asha Student' },
    };
    Order.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(order) });
    Order.findOneAndUpdate.mockReturnValue({
      populate: jest.fn().mockResolvedValue(updated),
    });
    OrderItem.find.mockResolvedValue([]);

    const moved = await request(app)
      .patch(`/api/staff/orders/${orderId}/status`)
      .set('Cookie', staffCookie)
      .send({ status: 'Confirmed' });
    expect(moved.status).toBe(200);
    expect(moved.body.data.status).toBe('Confirmed');
    expect(Order.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: orderId, status: 'Placed' },
      { status: 'Confirmed' },
      { new: true }
    );

    const stale = await request(app)
      .patch(`/api/staff/orders/${orderId}/status`)
      .set('Cookie', staffCookie)
      .send({ status: 'Ready' });
    expect(stale.status).toBe(409);
    expect(stale.body.message).toMatch(/Next allowed status is Confirmed/);
  });

  test('blocks students and reports a concurrent staff update as conflict', async () => {
    const forbidden = await request(app)
      .patch(`/api/staff/orders/${orderId}/status`)
      .set('Cookie', studentCookie)
      .send({ status: 'Confirmed' });
    expect(forbidden.status).toBe(403);

    Order.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: orderId, status: 'Placed' }),
    });
    Order.findOneAndUpdate.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });
    const conflict = await request(app)
      .patch(`/api/staff/orders/${orderId}/status`)
      .set('Cookie', staffCookie)
      .send({ status: 'Confirmed' });
    expect(conflict.status).toBe(409);
    expect(conflict.body.message).toMatch(/updated by someone else/i);
  });
});
