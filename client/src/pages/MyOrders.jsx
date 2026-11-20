// UI-04 Order Status (student). Route: /orders  (student only)
import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { STATUS_FLOW, formatDateTime } from '../utils/orderStatus';

const POLL_MS = 15000;

// GET /api/orders/my returns snake_case fields (order_id, total_amount, created_at, item_name).
const normalize = (o) => ({
  id: o._id || o.id || o.order_id,
  number: o.orderNumber || o.order_number || o.order_id,
  status: o.status,
  total: o.totalAmount ?? o.total_amount ?? 0,
  createdAt: o.createdAt || o.created_at,
  items: (o.items || []).map((i) => ({ name: i.item_name || i.itemName || i.name, quantity: i.quantity })),
});

function Progress({ status }) {
  const current = STATUS_FLOW.indexOf(status);
  return (
    <ol className="flex min-w-[34rem] items-center gap-1 text-[11px] sm:text-xs">
      {STATUS_FLOW.map((step, i) => (
        <li key={step} className="flex flex-1 flex-col items-center">
          <div className={`h-1.5 w-full rounded ${i <= current ? 'bg-emerald-500' : 'bg-gray-200'}`} />
          <span className={`mt-1 ${i === current ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{step}</span>
        </li>
      ))}
    </ol>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true);
    try {
      const res = await api.get('/orders/my');
      const list = res.data?.data ?? res.data ?? [];
      setOrders(list.map(normalize));
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load your orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const timer = setInterval(() => load(false), POLL_MS); // status updates appear without a reload
    return () => clearInterval(timer);
  }, [load]);

  if (loading) {
    return (
      <Layout>
        <p className="text-gray-500">Loading your orders...</p>
      </Layout>
    );
  }

  return (
    <Layout>
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">My Orders</h1>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded border border-red-200 bg-red-50 p-3 text-red-700">
          <span>{error}</span>
          <button onClick={() => load(true)} className="rounded bg-red-600 px-3 py-1 text-sm text-white">
            Retry
          </button>
        </div>
      )}

      {!error && orders.length === 0 && <p className="text-gray-500">You have not placed any orders yet.</p>}

      <ul className="space-y-4">
        {orders.map((o) => (
          <li key={o.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">Order {o.number}</p>
                <p className="text-sm text-gray-500">{formatDateTime(o.createdAt)}</p>
              </div>
              <StatusBadge status={o.status} />
            </div>

            {o.items.length > 0 && (
              <p className="mt-2 text-sm text-gray-700">{o.items.map((i) => `${i.quantity} x ${i.name}`).join(', ')}</p>
            )}
            <p className="mt-1 text-sm font-medium">Total: ₹{Number(o.total).toFixed(2)}</p>

            <div className="mt-3 overflow-x-auto">
              <Progress status={o.status} />
            </div>
            {o.status === 'Ready' && (
              <p className="mt-3 rounded bg-green-50 p-2 text-sm text-green-800">Your order is ready. Please collect it at the counter.</p>
            )}
          </li>
        ))}
      </ul>
    </div>
    </Layout>
  );
}
