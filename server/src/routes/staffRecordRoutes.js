const express = require('express');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const { requireAuth, requireRole } = require('../middleware/auth');
const { recordQuerySchema, parseDate } = require('../validators/recordValidator');

const router = express.Router();

// Require authentication; allow only staff and admin roles
router.use(requireAuth, requireRole('staff', 'admin'));

// GET /api/staff/records
router.get('/', async (req, res, next) => {
  try {
    const parsed = recordQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return res.status(400).json({
        message: issue ? issue.message : 'Invalid query parameters',
        errors: parsed.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { status, startDate, endDate } = parsed.data;
    const limit = parsed.data.limit || 100;
    const page = parsed.data.page || 1;
    const skip = (page - 1) * limit;

    const query = {};

    // Filter by status if specified and not 'All'
    if (status && status.toLowerCase() !== 'all') {
      query.status = status;
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = parseDate(startDate, false);
      }
      if (endDate) {
        query.createdAt.$lte = parseDate(endDate, true);
      }
    }

    // Newest records first
    const sort = { createdAt: -1 };

    const [orders, total, revenueResult] = await Promise.all([
      Order.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('studentId', 'name email'),
      Order.countDocuments(query),
      Order.aggregate([
        { $match: query },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
      ]),
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue
      ? Math.round(revenueResult[0].totalRevenue * 100) / 100
      : 0;

    // Batch fetch order items for all returned orders
    const orderIds = orders.map((o) => o._id);
    const items = await OrderItem.find({ orderId: { $in: orderIds } });

    const itemsByOrder = new Map();
    for (const item of items) {
      const key = String(item.orderId);
      if (!itemsByOrder.has(key)) itemsByOrder.set(key, []);
      itemsByOrder.get(key).push(item);
    }

    const data = orders.map((order) => {
      const orderItems = itemsByOrder.get(String(order._id)) || [];
      return {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        student: order.studentId
          ? {
              id: order.studentId._id,
              name: order.studentId.name,
              email: order.studentId.email,
            }
          : null,
        studentName: order.studentId?.name || 'Unknown Student',
        items: orderItems.map((item) => ({
          id: item._id,
          name: item.itemName,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
        })),
      };
    });

    return res.json({
      success: true,
      count: data.length,
      total,
      totalRevenue,
      page,
      limit,
      data,
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
