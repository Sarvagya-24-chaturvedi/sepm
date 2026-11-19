import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import CartPage from './CartPage';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));
vi.mock('../context/CartContext', () => ({ useCart: vi.fn() }));
vi.mock('../components/Layout', () => ({
  default: ({ children }) => <>{children}</>,
}));

const initialItems = [
  { menuItemId: 'samosa-id', name: 'Samosa', price: 25, quantity: 2 },
  { menuItemId: 'chai-id', name: 'Chai', price: 30, quantity: 1 },
];
const clearCart = vi.fn();

function CartHarness() {
  const [items, setItems] = useState(initialItems);
  useCart.mockReturnValue({
    items,
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    changeQuantity: (id, quantity) => setItems((current) =>
      current.map((item) => item.menuItemId === id ? { ...item, quantity } : item)),
    removeItem: (id) => setItems((current) => current.filter((item) => item.menuItemId !== id)),
    clearCart: () => {
      clearCart();
      setItems([]);
    },
  });
  return <CartPage />;
}

function renderCart() {
  return render(
    <MemoryRouter>
      <CartHarness />
    </MemoryRouter>
  );
}

describe('Increment 2: cart editing and checkout UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates line quantities, removes items, and recalculates the total', async () => {
    const user = userEvent.setup();
    renderCart();
    expect(screen.getByText('Total: ₹80.00')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Increase Samosa' }));
    expect(screen.getByText('Total: ₹105.00')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Decrease Samosa' }));
    expect(screen.getByText('Total: ₹80.00')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Remove' })[1]);
    expect(screen.getByText('Total: ₹50.00')).toBeInTheDocument();
    expect(screen.queryByText('Chai')).not.toBeInTheDocument();
  });

  it('shows the confirmed order and clears the cart only after successful placement', async () => {
    api.post.mockResolvedValue({
      data: {
        data: {
          order_id: 'ORD-1001',
          status: 'Placed',
          total_amount: 80,
          created_at: '2026-11-19T10:00:00.000Z',
          items: [{ id: 'line-1', item_name: 'Samosa', quantity: 2, subtotal: 50 }],
        },
      },
    });
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByRole('button', { name: 'Place Order' }));
    expect(await screen.findByText('Your order has been placed successfully!')).toBeInTheDocument();
    expect(screen.getByText('ORD-1001')).toBeInTheDocument();
    expect(screen.getByText('Placed')).toBeInTheDocument();
    expect(screen.getByText('₹80.00')).toBeInTheDocument();
    expect(clearCart).toHaveBeenCalledOnce();
    expect(api.post).toHaveBeenCalledWith(
      '/orders',
      { items: [{ menuItemId: 'samosa-id', quantity: 2 }, { menuItemId: 'chai-id', quantity: 1 }] },
      { headers: { 'Idempotency-Key': expect.any(String) } }
    );
    expect(screen.queryByText('Your cart is empty.')).not.toBeInTheDocument();
  });

  it('keeps items and retries with the same idempotency key after a failed placement', async () => {
    api.post
      .mockRejectedValueOnce({ response: { data: { message: 'Order service unavailable' } } })
      .mockResolvedValueOnce({
        data: {
          data: {
            order_id: 'ORD-1002',
            status: 'Placed',
            total_amount: 80,
            created_at: '2026-11-19T10:00:00.000Z',
            items: [],
          },
        },
      });
    const user = userEvent.setup();
    renderCart();

    await user.click(screen.getByRole('button', { name: 'Place Order' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Order service unavailable');
    expect(screen.getByText('Total: ₹80.00')).toBeInTheDocument();
    expect(clearCart).not.toHaveBeenCalled();
    await user.click(within(alert).getByRole('button', { name: 'Retry Order' }));

    expect(await screen.findByText('ORD-1002')).toBeInTheDocument();
    const firstKey = api.post.mock.calls[0][2].headers['Idempotency-Key'];
    const retryKey = api.post.mock.calls[1][2].headers['Idempotency-Key'];
    expect(retryKey).toBe(firstKey);
  });
});
