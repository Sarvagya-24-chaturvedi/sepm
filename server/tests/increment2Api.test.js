process.env.JWT_SECRET = 'increment-two-functional-test-secret';

jest.mock('../src/models/Order');
jest.mock('../src/models/OrderItem');
jest.mock('../src/models/MenuItem');

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const app = require('../src/app');
const Order = require('../src/models/Order');
const OrderItem = require('../src/models/OrderItem');
const MenuItem = require('../src/models/MenuItem');

const studentId = '507f1f77bcf86cd799439011';
const itemId = '507f1f77bcf86cd799439099';
const orderId = '507f1f77bcf86cd799439088';
const studentCookie = `token=${jwt.sign(
  { sub: studentId, name: 'Student', role: 'student' },
  process.env.JWT_SECRET
)}`;
const staffCookie = `token=${jwt.sign(
  { sub: '507f1f77bcf86cd799439012', name: 'Staff', role: 'staff' },
  process.env.JWT_SECRET
)}`;

describe('Increment 2 API: order placement', () => {
  let session;

  beforeEach(() => {
    jest.clearAllMocks();
    session = {
      withTransaction: jest.fn(async (callback) => callback()),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    jest.spyOn(mongoose, 'startSession').mockResolvedValue(session);
    Order.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    MenuItem.find.mockResolvedValue([
      { _id: itemId, name: 'Samosa', price: 25, isAvailable: true },
    ]);
    Order.create.mockImplementation(async ([order]) => [{
      ...order,
      _id: orderId,
      createdAt: new Date('2026-11-19T10:00:00.000Z'),
      updatedAt: new Date('2026-11-19T10:00:00.000Z'),
    }]);
    OrderItem.insertMany.mockResolvedValue([]);
    OrderItem.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([{
        _id: '507f1f77bcf86cd799439077',
        menuItemId: itemId,
        itemName: 'Samosa',
        quantity: 2,
        unitPrice: 25,
        subtotal: 50,
      }]),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('calculates totals from menu prices, creates the order transactionally, and returns confirmation', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', studentCookie)
      .set('Idempotency-Key', 'checkout-attempt-1')
      .send({
        items: [{ menuItemId: itemId, quantity: 2, unitPrice: 0.01 }],
        totalAmount: 0.02,
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      order_id: expect.stringMatching(/^ORD-/),
      status: 'Placed',
      total_amount: 50,
      items: [{ item_name: 'Samosa', unit_price: 25, quantity: 2, subtotal: 50 }],
    });
    expect(Order.create).toHaveBeenCalledWith(
      [expect.objectContaining({ studentId, totalAmount: 50, status: 'Placed', idempotencyKey: 'checkout-attempt-1' })],
      { session }
    );
    expect(OrderItem.insertMany).toHaveBeenCalledWith(
      [expect.objectContaining({ menuItemId: itemId, itemName: 'Samosa', quantity: 2, subtotal: 50, orderId })],
      { session }
    );
    expect(session.withTransaction).toHaveBeenCalledTimes(1);
    expect(session.endSession).toHaveBeenCalledTimes(1);
  });

  test('rejects invalid quantities before database writes', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Cookie', studentCookie)
      .send({ items: [{ menuItemId: itemId, quantity: 0 }] });

    expect(response.status).toBe(400);
    expect(Order.create).not.toHaveBeenCalled();
    expect(mongoose.startSession).not.toHaveBeenCalled();
  });

  test('denies staff order placement and rejects unavailable menu items', async () => {
    const forbidden = await request(app)
      .post('/api/orders')
      .set('Cookie', staffCookie)
      .send({ items: [{ menuItemId: itemId, quantity: 1 }] });
    expect(forbidden.status).toBe(403);

    MenuItem.find.mockResolvedValue([]);
    const unavailable = await request(app)
      .post('/api/orders')
      .set('Cookie', studentCookie)
      .send({ items: [{ menuItemId: itemId, quantity: 1 }] });
    expect(unavailable.status).toBe(409);
    expect(Order.create).not.toHaveBeenCalled();
  });
});
