const express = require('express');
const {
  createOrder,
  getMyOrders,
  getOrder,
  listOrders,
} = require('../controllers/orderController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);
router.post('/', requireRole('student'), createOrder);
router.get('/my', requireRole('student'), getMyOrders);
router.get('/:orderId', requireRole('student'), getOrder);
router.get('/', requireRole('staff', 'admin'), listOrders);

module.exports = router;
