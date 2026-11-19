import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../api/axios';
import RecordsPage from './RecordsPage';

vi.mock('../api/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));
vi.mock('../components/Layout', () => ({
  default: ({ children }) => <>{children}</>,
}));

const record = {
  id: 'record-1',
  orderNumber: 'ORD-4001',
  status: 'Completed',
  totalAmount: 120,
  createdAt: '2026-11-19T10:00:00.000Z',
  studentName: 'Asha Student',
  items: [{ name: 'Masala Dosa', quantity: 2, subtotal: 120 }],
};

function renderRecords() {
  return render(
    <MemoryRouter>
      <RecordsPage />
    </MemoryRouter>
  );
}

describe('Increment 4: records, filters, and retry UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows records and revenue, then applies status and date filters', async () => {
    api.get.mockResolvedValue({ data: { data: [record], total: 1, totalRevenue: 120 } });
    const user = userEvent.setup();
    renderRecords();

    expect(await screen.findByRole('row', { name: /ORD-4001/ })).toBeInTheDocument();
    expect(screen.getAllByText('Asha Student').length).toBeGreaterThan(0);
    expect(screen.getAllByText('₹120.00').length).toBeGreaterThan(0);
    expect(api.get).toHaveBeenLastCalledWith('/staff/records', { params: { page: 1, limit: 100 } });

    await user.selectOptions(screen.getByLabelText('Status'), 'Completed');
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/staff/records', {
      params: { page: 1, limit: 100, status: 'Completed' },
    }));

    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-11-10' } });
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/staff/records', {
      params: { page: 1, limit: 100, status: 'Completed', startDate: '2026-11-10' },
    }));
    const requestCount = api.get.mock.calls.length;
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-11-01' } });

    expect(await screen.findByRole('alert')).toHaveTextContent('Start date cannot be after end date.');
    expect(api.get).toHaveBeenCalledTimes(requestCount);
  });

  it('shows a server error and retries to load records', async () => {
    api.get
      .mockRejectedValueOnce({ response: { data: { message: 'Records service unavailable' } } })
      .mockResolvedValueOnce({ data: { data: [record], total: 1, totalRevenue: 120 } });
    renderRecords();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Records service unavailable');
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('row', { name: /ORD-4001/ })).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('paginates the records list', async () => {
    api.get
      .mockResolvedValueOnce({ data: { data: [record], total: 150, totalRevenue: 120 } })
      .mockResolvedValueOnce({ data: { data: [{ ...record, id: 'record-2', orderNumber: 'ORD-4002' }], total: 150, totalRevenue: 120 } });
    const user = userEvent.setup();
    renderRecords();

    expect(await screen.findByRole('navigation', { name: 'Records pagination' }))
      .toHaveTextContent('Page 1 of 2');
    await user.click(screen.getByRole('button', { name: 'Next →' }));
    expect(await screen.findByRole('row', { name: /ORD-4002/ })).toBeInTheDocument();
    expect(api.get).toHaveBeenLastCalledWith('/staff/records', { params: { page: 2, limit: 100 } });
  });
});
