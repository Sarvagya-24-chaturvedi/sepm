const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const {
  createMenuItemSchema,
  updateMenuItemSchema,
  availabilitySchema,
} = require('../validators/menuValidator');

async function getMenu(req, res, next) {
  try {
    const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const filter = {};
    if (category && category.toLowerCase() !== 'all') {
      filter.category = category;
    }

    const [items, categories] = await Promise.all([
      MenuItem.find(filter).sort({ category: 1, name: 1 }),
      MenuItem.distinct('category'),
    ]);

    categories.sort((a, b) => a.localeCompare(b));

    return res.json({
      items,
      categories,
    });
  } catch (err) {
    return next(err);
  }
}

async function createMenuItem(req, res, next) {
  try {
    const data = createMenuItemSchema.parse(req.body);
    const item = await MenuItem.create(data);
    return res.status(201).json({ item });
  } catch (err) {
    return next(err);
  }
}

async function updateMenuItem(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    const data = updateMenuItemSchema.parse(req.body);
    const item = await MenuItem.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    return res.json({ item });
  } catch (err) {
    return next(err);
  }
}

async function updateMenuAvailability(req, res, next) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    const { isAvailable } = availabilitySchema.parse(req.body);
    const item = await MenuItem.findByIdAndUpdate(
      id,
      { isAvailable },
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    return res.json({ item });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getMenu,
  createMenuItem,
  updateMenuItem,
  updateMenuAvailability,
};
