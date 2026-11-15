import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Layout from '../components/Layout';
import { useCart } from '../context/CartContext';

const formatCurrency = (amount) =>
  `₹${Number(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function getIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function CartPage() {
  const { items, total, changeQuantity, removeItem, clearCart } = useCart();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const idempotencyKey = useRef(getIdempotencyKey());

  const placeOrder = async () => {
    setPlacing(true);
    setError('');
    try {
      const response = await api.post(
        '/orders',
        { items: items.map(({ menuItemId, quantity }) => ({ menuItemId, quantity })) },
        { headers: { 'Idempotency-Key': idempotencyKey.current } }
      );
      setConfirmation(response.data.data);
      clearCart();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          (err.message === 'Network Error'
            ? 'Network error. Please check your connection and retry. Your cart has been kept.'
            : 'Unable to place your order. Your cart has been kept so you can retry.')
      );
    } finally {
      setPlacing(false);
    }
  };

  if (confirmation) {
    return (
      <Layout>
        <section className="mx-auto max-w-2xl rounded-xl border border-emerald-200 bg-white p-6 shadow-xs">
          <p className="text-sm font-semibold text-emerald-700">Order confirmed</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            Your order has been placed successfully!
          </h1>
          <dl className="mt-6 grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
            <div><dt className="font-semibold">Order ID</dt><dd>{confirmation.order_id}</dd></div>
            <div><dt className="font-semibold">Status</dt><dd>{confirmation.status}</dd></div>
            <div><dt className="font-semibold">Order date</dt><dd>{new Date(confirmation.created_at).toLocaleString()}</dd></div>
            <div><dt className="font-semibold">Total</dt><dd>{formatCurrency(confirmation.total_amount)}</dd></div>
          </dl>
          <div className="mt-6 space-y-2 border-t border-slate-200 pt-4">
            {confirmation.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 text-sm">
                <span>{item.item_name} × {item.quantity}</span>
                <span className="font-medium">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/menu" className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
              Continue shopping
            </Link>
          </div>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your Cart</h1>
          <p className="mt-1 text-sm text-slate-600">Review your items before placing the order.</p>
        </div>
        {error && (
          <div
            role="alert"
            className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{error}</span>
            <button
              type="button"
              disabled={placing}
              onClick={placeOrder}
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 shrink-0"
            >
              {placing ? 'Retrying...' : 'Retry Order'}
            </button>
          </div>
        )}
        {items.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="font-medium text-slate-700">Your cart is empty.</p>
            <Link to="/menu" className="mt-4 inline-block text-sm font-semibold text-amber-700 hover:text-amber-800">Browse the menu</Link>
          </section>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
            <div className="divide-y divide-slate-200">
              {items.map((item) => (
                <div key={item.menuItemId} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-slate-900">{item.name}</h2>
                    <p className="mt-1 text-sm text-slate-600">{formatCurrency(item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label={`Decrease ${item.name}`} onClick={() => item.quantity === 1 ? removeItem(item.menuItemId) : changeQuantity(item.menuItemId, item.quantity - 1)} className="h-8 w-8 rounded border border-slate-300 text-lg hover:bg-slate-100">−</button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button type="button" aria-label={`Increase ${item.name}`} onClick={() => changeQuantity(item.menuItemId, item.quantity + 1)} className="h-8 w-8 rounded border border-slate-300 text-lg hover:bg-slate-100">+</button>
                  </div>
                  <p className="w-24 text-right font-semibold text-slate-900">{formatCurrency(item.price * item.quantity)}</p>
                  <button type="button" onClick={() => removeItem(item.menuItemId)} className="text-sm font-medium text-red-700 hover:text-red-800">Remove</button>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
              <Link to="/menu" className="text-sm font-semibold text-amber-700 hover:text-amber-800">Continue shopping</Link>
              <div className="flex items-center gap-5">
                <p className="text-lg font-bold text-slate-900">Total: {formatCurrency(total)}</p>
                <button type="button" disabled={placing} onClick={placeOrder} className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {placing ? 'Placing order...' : error ? 'Retry Order' : 'Place Order'}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}
