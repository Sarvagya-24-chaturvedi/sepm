const express = require('express');
const {
  getMenu,
  createMenuItem,
  updateMenuItem,
  updateMenuAvailability,
} = require('../controllers/menuController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, getMenu);
router.post('/', requireAuth, requireRole('admin'), createMenuItem);
router.put('/:id', requireAuth, requireRole('admin'), updateMenuItem);
router.patch('/:id/availability', requireAuth, requireRole('admin'), updateMenuAvailability);

module.exports = router;
