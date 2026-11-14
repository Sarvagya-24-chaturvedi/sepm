const express = require('express');
const mongoose = require('mongoose');
const { z } = require('zod');
// TODO: copy these three imports exactly as routes/orderRoutes.js writes them
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const { requireAuth, requireRole } = require('../middleware/auth');
const { STATUS_FLOW, nextStatus, isValidTransition } = require('../utils/orderStatus');

const router = express.Router();

// 401 if not logged in, 403 if a student tries to reach any route here.
router.use(requireAuth, requireRole('staff', 'admin'));

const statusBody = z.object({ status: z.enum(STATUS_FLOW) });
const listQuery = z.object({ status: z.enum([...STATUS_FLOW, 'active']).optional() });

const shape = (order, items = []) => ({
  id: order._id,
  orderNumber: order.orderNumber,
  status: order.status,
  nextStatus: nextStatus(order.status),
  totalAmount: order.totalAmount,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  student: order.studentId?.name ? { id: order.studentId._id, name: order.studentId.name } : null,
  items: items.map((i) => ({ name: i.itemName, quantity: i.quantity, subtotal: i.subtotal })),
});

// GET /api/staff/orders?status=active|Placed|Confirmed|Preparing|Ready|Completed
// Default is "active" (everything not Completed), oldest first so staff work in queue order.
router.get('/', async (req, res, next) => {
  try {
    const parsed = listQuery.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid status filter', errors: parsed.error.flatten() });
    }
    const filter = parsed.data.status ?? 'active';
    const query = filter === 'active' ? { status: { $ne: 'Completed' } } : { status: filter };
    const sort = filter === 'Completed' ? { updatedAt: -1 } : { createdAt: 1 };

    const orders = await Order.find(query).sort(sort).limit(100).populate('studentId', 'name');
    const items = await OrderItem.find({ orderId: { $in: orders.map((o) => o._id) } });

    const byOrder = new Map();
    for (const it of items) {
      const key = String(it.orderId);
      if (!byOrder.has(key)) byOrder.set(key, []);
      byOrder.get(key).push(it);
    }

    res.json({ success: true, data: orders.map((o) => shape(o, byOrder.get(String(o._id)))) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/staff/orders/:orderId/status   body: { "status": "Confirmed" }
router.patch('/:orderId/status', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.isValidObjectId(orderId)) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const parsed = statusBody.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: `Status must be one of: ${STATUS_FLOW.join(', ')}`,
        errors: parsed.error.flatten(),
      });
    }
    const target = parsed.data.status;

    const order = await Order.findById(orderId).select('status');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!isValidTransition(order.status, target)) {
      const allowed = nextStatus(order.status);
      return res.status(409).json({
        message: allowed
          ? `Cannot move order from ${order.status} to ${target}. Next allowed status is ${allowed}.`
          : `Order is already ${order.status} and cannot be changed.`,
      });
    }

    // Compare-and-set: only update if the status is still what we just read.
    // Stops two staff members double-advancing the same order.
    const updated = await Order.findOneAndUpdate(
      { _id: orderId, status: order.status },
      { status: target },
      { new: true }
    ).populate('studentId', 'name');

    if (!updated) {
      return res.status(409).json({ message: 'Order was updated by someone else. Refresh and try again.' });
    }

    const items = await OrderItem.find({ orderId: updated._id });
    res.json({ success: true, message: `Order moved to ${target}`, data: shape(updated, items) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
