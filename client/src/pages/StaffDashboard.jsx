// UI-05 Staff Dashboard. Route: /staff  (staff and admin). Replaces the Increment 1 placeholder.
import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import StatusBadge from '../components/StatusBadge';
import { STATUS_FLOW, formatDateTime } from '../utils/orderStatus';

const POLL_MS = 10000;
const TABS = [{ key: 'active', label: 'Active' }, ...STATUS_FLOW.map((s) => ({ key: s, label: s }))];

export default function StaffDashboard() {
  const [filter, setFilter] = useState('active');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState(null); // { type: 'success' | 'error', text }

  const load = useCallback(
    async (initial = false) => {
      if (initial) setLoading(true);
      try {
        const res = await api.get('/staff/orders', { params: { status: filter } });
        setOrders(res.data.data);
        setError('');
      } catch (err) {
        setError(err.response?.data?.message || 'Could not load orders.');
      } finally {
        setLoading(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    load(true);
    const timer = setInterval(() => {
      if (!busyId) load(false);
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [load, busyId]);

  const advance = async (order) => {
    setBusyId(order.id);
    setNotice(null);
    try {
      const res = await api.patch(`/staff/orders/${order.id}/status`, { status: order.nextStatus });
      setNotice({ type: 'success', text: `${order.orderNumber} moved to ${res.data.data.status}.` });
    } catch (err) {
      // 409 = invalid transition or someone else already changed it; reload to show the real state.
      setNotice({ type: 'error', text: err.response?.data?.message || 'Could not update the order.' });
    } finally {
      setBusyId(null);
      load(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff Dashboard</h1>
        <button onClick={() => load(true)} className="rounded border px-3 py-1 text-sm hover:bg-gray-50">
          Refresh
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === t.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {notice && (
        <div
          role="status"
          className={`mb-4 rounded p-3 text-sm ${
            notice.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {notice.text}
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center justify-between rounded border border-red-200 bg-red-50 p-3 text-red-700">
          <span>{error}</span>
          <button onClick={() => load(true)} className="rounded bg-red-600 px-3 py-1 text-sm text-white">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500">Loading orders...</p>
      ) : orders.length === 0 && !error ? (
        <p className="text-gray-500">No orders in this view.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Student</th>
                <th className="p-3">Items</th>
                <th className="p-3">Total</th>
                <th className="p-3">Placed at</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t align-top">
                  <td className="p-3 font-medium">{o.orderNumber}</td>
                  <td className="p-3">{o.student?.name || '-'}</td>
                  <td className="p-3">{o.items.map((i) => `${i.quantity} x ${i.name}`).join(', ')}</td>
                  <td className="p-3">₹{Number(o.totalAmount).toFixed(2)}</td>
                  <td className="p-3 whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                  <td className="p-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="p-3">
                    {o.nextStatus ? (
                      <button
                        onClick={() => advance(o)}
                        disabled={busyId === o.id}
                        className="rounded bg-gray-900 px-3 py-1 text-white disabled:opacity-50"
                      >
                        {busyId === o.id ? 'Updating...' : `Mark ${o.nextStatus}`}
                      </button>
                    ) : (
                      <span className="text-gray-400">Done</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
