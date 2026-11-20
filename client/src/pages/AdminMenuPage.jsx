import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Layout from '../components/Layout';
import ErrorRetry from '../components/ErrorRetry';

const EMPTY_FORM = { name: '', category: '', imageUrl: '', price: '', isAvailable: true };

export default function AdminMenuPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/menu');
      setItems(res.data.items || []);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to load menu items.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openAddModal = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      category: item.category,
      imageUrl: item.imageUrl || '',
      price: String(item.price),
      isAvailable: item.isAvailable,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingItem(null);
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!form.name.trim()) {
      errors.name = 'Name is required';
    }
    if (!form.category.trim()) {
      errors.category = 'Category is required';
    }
    if (form.imageUrl.trim()) {
      try {
        if (new URL(form.imageUrl.trim()).protocol !== 'https:') {
          errors.imageUrl = 'Image URL must use HTTPS';
        }
      } catch {
        errors.imageUrl = 'Enter a valid HTTPS image URL';
      }
    }
    const parsedPrice = Number(form.price);
    if (!form.price || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      errors.price = 'Price must be a positive number';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFeedback({ type: '', message: '' });
    if (!validateForm()) return;

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      imageUrl: form.imageUrl.trim(),
      price: Number(form.price),
      isAvailable: Boolean(form.isAvailable),
    };

    try {
      if (editingItem) {
        const res = await api.put(`/menu/${editingItem._id}`, payload);
        setItems((prev) =>
          prev.map((it) => (it._id === editingItem._id ? res.data.item : it))
        );
        setFeedback({ type: 'success', message: `Updated "${res.data.item.name}".` });
      } else {
        const res = await api.post('/menu', payload);
        setItems((prev) => [...prev, res.data.item]);
        setFeedback({ type: 'success', message: `Added "${res.data.item.name}".` });
      }
      closeModal();
    } catch (err) {
      const msg =
        err.response?.data?.message || 'Could not save menu item.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    setFeedback({ type: '', message: '' });
    setTogglingId(item._id);
    try {
      const res = await api.patch(`/menu/${item._id}/availability`, {
        isAvailable: !item.isAvailable,
      });
      setItems((prev) =>
        prev.map((it) => (it._id === item._id ? res.data.item : it))
      );
      setFeedback({
        type: 'success',
        message: `"${res.data.item.name}" marked as ${
          res.data.item.isAvailable ? 'available' : 'unavailable'
        }.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err.response?.data?.message || 'Failed to update availability.',
      });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Admin Menu Management
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Add, edit, or enable/disable canteen menu items
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          >
            + Add Item
          </button>
        </div>

        {feedback.message && (
          <div
            role="status"
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">
            Loading menu items...
          </div>
        ) : error ? (
          <ErrorRetry message={error} onRetry={fetchItems} />
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              No menu items yet. Click &ldquo;Add Item&rdquo; to create one.
            </p>
          </div>
        ) : (
          <>
          <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs sm:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item) => (
                    <tr
                      key={item._id}
                      className={item.isAvailable ? 'bg-white' : 'bg-slate-50/70'}
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item.name}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.category}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        &#8377;{Number(item.price).toFixed(0)}
                      </td>
                      <td className="px-4 py-3">
                        {item.isAvailable ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                            Unavailable
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={togglingId === item._id}
                          onClick={() => handleToggleAvailability(item)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50 ${
                            item.isAvailable
                              ? 'bg-slate-700 hover:bg-slate-800'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          {togglingId === item._id
                            ? 'Updating...'
                            : item.isAvailable
                            ? 'Disable'
                            : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-3 sm:hidden">
            {items.map((item) => (
              <article
                key={item._id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="wrap-break-word font-semibold text-slate-900">{item.name}</h2>
                    <p className="mt-1 text-xs text-slate-600">{item.category}</p>
                  </div>
                  {item.isAvailable ? (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      Available
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      Unavailable
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <p className="font-semibold text-slate-900">
                    &#8377;{Number(item.price).toFixed(0)}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={togglingId === item._id}
                      onClick={() => handleToggleAvailability(item)}
                      className={`rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                        item.isAvailable
                          ? 'bg-slate-700 hover:bg-slate-800'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {togglingId === item._id
                        ? 'Updating...'
                        : item.isAvailable
                        ? 'Disable'
                        : 'Enable'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          </>
        )}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="menu-modal-title"
        >
          <div className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-lg sm:p-6">
            <h2
              id="menu-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
            </h2>

            <form onSubmit={handleSave} noValidate className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="item-name"
                  className="block text-sm font-medium text-slate-800"
                >
                  Item Name
                </label>
                <input
                  id="item-name"
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Masala Dosa"
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs font-medium text-red-700">
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="item-category"
                  className="block text-sm font-medium text-slate-800"
                >
                  Category
                </label>
                <input
                  id="item-category"
                  type="text"
                  value={form.category}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, category: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="e.g. Breakfast, Snacks, Beverages"
                />
                {formErrors.category && (
                  <p className="mt-1 text-xs font-medium text-red-700">
                    {formErrors.category}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="item-image-url"
                  className="block text-sm font-medium text-slate-800"
                >
                  Image URL (optional)
                </label>
                <input
                  id="item-image-url"
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="https://example.com/dish.jpg"
                />
                {formErrors.imageUrl && (
                  <p className="mt-1 text-xs font-medium text-red-700">
                    {formErrors.imageUrl}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="item-price"
                  className="block text-sm font-medium text-slate-800"
                >
                  Price (&#8377;)
                </label>
                <input
                  id="item-price"
                  type="number"
                  min="1"
                  step="1"
                  value={form.price}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, price: e.target.value }))
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="50"
                />
                {formErrors.price && (
                  <p className="mt-1 text-xs font-medium text-red-700">
                    {formErrors.price}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="item-available"
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      isAvailable: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <label
                  htmlFor="item-available"
                  className="text-sm font-medium text-slate-800"
                >
                  Available for sale
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
