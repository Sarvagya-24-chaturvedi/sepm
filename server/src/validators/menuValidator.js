const { z } = require('zod');

const createMenuItemSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required'),
  category: z.string({ required_error: 'Category is required' }).trim().min(1, 'Category is required'),
  price: z
    .number({ required_error: 'Price is required', invalid_type_error: 'Price must be a number' })
    .positive('Price must be a positive number'),
  isAvailable: z.boolean({ invalid_type_error: 'isAvailable must be a boolean' }).default(true),
});

const updateMenuItemSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(1, 'Name is required'),
  category: z.string({ required_error: 'Category is required' }).trim().min(1, 'Category is required'),
  price: z
    .number({ required_error: 'Price is required', invalid_type_error: 'Price must be a number' })
    .positive('Price must be a positive number'),
  isAvailable: z.boolean({ invalid_type_error: 'isAvailable must be a boolean' }).optional(),
});

const availabilitySchema = z.object({
  isAvailable: z.boolean({
    required_error: 'isAvailable is required',
    invalid_type_error: 'isAvailable must be a boolean',
  }),
});

module.exports = {
  createMenuItemSchema,
  updateMenuItemSchema,
  availabilitySchema,
};
