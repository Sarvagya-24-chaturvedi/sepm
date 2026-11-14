const { z } = require('zod');

const orderSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1, 'Menu item ID is required'),
        quantity: z
          .number({ required_error: 'Quantity is required', invalid_type_error: 'Quantity must be an integer' })
          .int('Quantity must be a positive integer')
          .positive('Quantity must be a positive integer'),
      })
    )
    .min(1, 'Order must contain at least one item')
    .superRefine((items, ctx) => {
      const ids = new Set();
      items.forEach((item, index) => {
        if (ids.has(item.menuItemId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [index, 'menuItemId'],
            message: 'Each menu item may only appear once',
          });
        }
        ids.add(item.menuItemId);
      });
    }),
});

module.exports = { orderSchema };
