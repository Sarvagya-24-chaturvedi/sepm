import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import MyOrders from './MyOrders';
import StaffDashboard from './StaffDashboard';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));
vi.mock('../components/Layout', () => ({
  default: ({ children }) => <>{children}</>,
}));

const placedOrder = {
  id: 'order-1',
  orderNumber: 'ORD-2001',
  status: 'Placed',
  totalAmount: 50,
  createdAt: '2026-11-19T10:00:00.000Z',
  student: { name: 'Asha Student' },
  items: [{ name: 'Samosa', quantity: 2 }],
  nextStatus: 'Confirmed',
};

function renderPage(Page) {
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>
  );
}

describe('Increment 3: order status and staff dashboard UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows student order status and refreshes to the Ready pickup message', async () => {
    let refresh;
    vi.spyOn(globalThis, 'setInterval').mockImplementation((callback, delay) => {
      if (delay === 15000) refresh = callback;
      return 1;
    });
    api.get
      .mockResolvedValueOnce({ data: { data: [{ ...placedOrder, items: [{ item_name: 'Samosa', quantity: 2 }] }] } })
      .mockResolvedValueOnce({ data: { data: [{ ...placedOrder, status: 'Ready', items: [{ item_name: 'Samosa', quantity: 2 }] }] } });
    renderPage(MyOrders);

    expect(await screen.findByText('Order ORD-2001')).toBeInTheDocument();
    expect(screen.getAllByText('Placed').length).toBeGreaterThan(0);
    await act(async () => {
      await refresh();
    });

    expect(await screen.findByText('Your order is ready. Please collect it at the counter.')).toBeInTheDocument();
    expect(screen.getAllByText('Ready').length).toBeGreaterThan(0);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('lists dashboard orders, advances status, and shows the update to staff', async () => {
    api.get
      .mockResolvedValueOnce({ data: { data: [placedOrder] } })
      .mockResolvedValueOnce({ data: { data: [{ ...placedOrder, status: 'Confirmed', nextStatus: 'Preparing' }] } });
    api.patch.mockResolvedValue({ data: { data: { status: 'Confirmed' } } });
    const user = userEvent.setup();
    renderPage(StaffDashboard);

    expect(await screen.findAllByText('Asha Student')).toHaveLength(2);
    expect(screen.getAllByText('2 x Samosa')).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: 'Mark Confirmed' })[0]);

    expect(await screen.findByRole('status')).toHaveTextContent('ORD-2001 moved to Confirmed.');
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
      '/staff/orders/order-1/status',
      { status: 'Confirmed' }
    ));
    expect(await screen.findAllByRole('button', { name: 'Mark Preparing' })).toHaveLength(2);
  });
});
