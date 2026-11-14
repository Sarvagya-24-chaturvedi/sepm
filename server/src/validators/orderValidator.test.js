const { orderSchema } = require('./orderValidator');

describe('orderSchema', () => {
  const menuItemId = '507f1f77bcf86cd799439011';

  test('accepts a positive integer quantity', () => {
    expect(orderSchema.parse({
      items: [{ menuItemId, quantity: 2 }],
    })).toEqual({
      items: [{ menuItemId, quantity: 2 }],
    });
  });

  test.each([0, -1, 1.5])('rejects invalid quantity %p', (quantity) => {
    expect(() => orderSchema.parse({
      items: [{ menuItemId, quantity }],
    })).toThrow();
  });

  test('rejects an empty order and duplicate menu items', () => {
    expect(() => orderSchema.parse({ items: [] })).toThrow('Order must contain at least one item');
    expect(() => orderSchema.parse({
      items: [
        { menuItemId, quantity: 1 },
        { menuItemId, quantity: 1 },
      ],
    })).toThrow('Each menu item may only appear once');
  });
});
