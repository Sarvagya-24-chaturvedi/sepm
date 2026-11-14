const mongoose = require('mongoose');
const Order = require('../models/Order');
const OrderItem = require('../models/OrderItem');
const MenuItem = require('../models/MenuItem');
const { orderSchema } = require('../validators/orderValidator');

function toOrderResponse(order, items) {
  return {
    id: order._id.toString(),
    order_id: order.orderNumber,
    status: order.status,
    total_amount: order.totalAmount,
    items: items.map((item) => ({
      id: item._id.toString(),
      menu_item_id: item.menuItemId.toString(),
      item_name: item.itemName,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.subtotal,
    })),
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}

async function getOrderWithItems(order) {
  const items = await OrderItem.find({ orderId: order._id }).sort({ _id: 1 });
  return toOrderResponse(order, items);
}

async function createOrder(req, res, next) {
  let session;
  try {
    const data = orderSchema.parse(req.body);
    const idempotencyKey = typeof req.get('Idempotency-Key') === 'string'
      ? req.get('Idempotency-Key').trim()
      : '';

    if (idempotencyKey) {
      const previousOrder = await Order.findOne({
        studentId: req.user.id,
        idempotencyKey,
      }).select('+idempotencyKey');
      if (previousOrder) {
        return res.status(200).json({
          success: true,
          message: 'Order already placed',
          data: await getOrderWithItems(previousOrder),
        });
      }
    }

    const menuItemIds = data.items.map((item) => item.menuItemId);
    if (menuItemIds.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
      return res.status(400).json({ message: 'One or more menu item IDs are invalid' });
    }

    const menuItems = await MenuItem.find({
      _id: { $in: menuItemIds },
      isAvailable: true,
    });
    if (menuItems.length !== menuItemIds.length) {
      return res.status(409).json({
        message: 'One or more selected menu items are unavailable or no longer exist',
      });
    }

    const menuById = new Map(menuItems.map((item) => [item._id.toString(), item]));
    const orderItems = data.items.map((requestedItem) => {
      const menuItem = menuById.get(requestedItem.menuItemId);
      const unitPrice = Math.round(menuItem.price * 100) / 100;
      const subtotal = Math.round(unitPrice * requestedItem.quantity * 100) / 100;
      return {
        menuItemId: menuItem._id,
        itemName: menuItem.name,
        unitPrice,
        quantity: requestedItem.quantity,
        subtotal,
      };
    });
    const totalAmount = Math.round(
      orderItems.reduce((total, item) => total + item.subtotal, 0) * 100
    ) / 100;

    session = await mongoose.startSession();
    let order;
    await session.withTransaction(async () => {
      const orderNumber = `ORD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      [order] = await Order.create(
        [{
          orderNumber,
          studentId: req.user.id,
          totalAmount,
          status: 'Placed',
          ...(idempotencyKey ? { idempotencyKey } : {}),
        }],
        { session }
      );
      await OrderItem.insertMany(
        orderItems.map((item) => ({ ...item, orderId: order._id })),
        { session }
      );
    });

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: await getOrderWithItems(order),
    });
  } catch (err) {
    if (err && err.code === 11000 && err.keyPattern?.idempotencyKey) {
      const previousOrder = await Order.findOne({
        studentId: req.user.id,
        idempotencyKey: req.get('Idempotency-Key'),
      }).select('+idempotencyKey');
      if (previousOrder) {
        return res.status(200).json({
          success: true,
          message: 'Order already placed',
          data: await getOrderWithItems(previousOrder),
        });
      }
    }
    return next(err);
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

async function getMyOrders(req, res, next) {
  try {
    const orders = await Order.find({ studentId: req.user.id }).sort({ createdAt: -1 });
    const data = await Promise.all(orders.map(getOrderWithItems));
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.orderId)) {
      return res.status(404).json({ message: 'Order not found' });
    }
    const order = await Order.findOne({
      _id: req.params.orderId,
      studentId: req.user.id,
    });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    return res.json({ success: true, data: await getOrderWithItems(order) });
  } catch (err) {
    return next(err);
  }
}

async function listOrders(_req, res, next) {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(100);
    const data = await Promise.all(orders.map(getOrderWithItems));
    return res.json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

module.exports = { createOrder, getMyOrders, getOrder, listOrders };
