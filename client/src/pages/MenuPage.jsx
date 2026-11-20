import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Layout from '../components/Layout';
import ErrorRetry from '../components/ErrorRetry';
import { useCart } from '../context/CartContext';

const DEFAULT_MENU_IMAGES = {
  'Masala Dosa': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D?auto=format&fit=crop&w=800&q=80',
  'Idli Vada Combo': 'https://images.unsplash.com/photo-1630383249896-424e482df921?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D?auto=format&fit=crop&w=800&q=80',
  'Poha': 'https://images.unsplash.com/photo-1789991184412-c29c9dfa2b39?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D?auto=format&fit=crop&w=800&q=80',
  'Veg Biryani': 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D?auto=format&fit=crop&w=800&q=80',
  'Paneer Butter Masala & Naan': 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D?auto=format&fit=crop&w=800&q=80',
  'Rajma Chawal': 'https://images.unsplash.com/photo-1668236534990-73c4ed23043c?w=600&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D?auto=format&fit=crop&w=800&q=80',
  'Samosa (2 pcs)': 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=800&q=80',
  'Samosa': 'https://images.unsplash.com/photo-1601050690117-94f5f6fa8bd7?auto=format&fit=crop&w=800&q=80',
  'Vada Pav': 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=800&q=80',
  'Filter Coffee': 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=800&q=80',
  'Cold Coffee': 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80',
};

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { addItem, items: cartItems } = useCart();

  const fetchMenu = useCallback(async (category) => {
    setLoading(true);
    setError('');
    try {
      const params =
        category && category !== 'All' ? { category } : undefined;
      const res = await api.get('/menu', { params });
      setItems(res.data.items || []);
      setCategories(res.data.categories || []);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to load menu. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu(selectedCategory);
  }, [fetchMenu, selectedCategory]);

  const filterOptions = ['All', ...categories];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Canteen Menu</h1>
            <p className="mt-1 text-sm text-slate-600">
              Browse available dishes and beverages
            </p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {filterOptions.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 ${
                  selectedCategory === cat
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-28 rounded-xl bg-white border border-slate-200 p-4 animate-pulse"
              >
                <div className="h-4 w-2/3 bg-slate-200 rounded" />
                <div className="mt-3 h-3 w-1/3 bg-slate-200 rounded" />
                <div className="mt-5 h-4 w-1/4 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <ErrorRetry
            message={error}
            onRetry={() => fetchMenu(selectedCategory)}
          />
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              No menu items found
              {selectedCategory !== 'All' ? ` in "${selectedCategory}"` : ''}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <article
                key={item._id}
                className={`overflow-hidden rounded-xl border transition-colors ${
                  item.isAvailable
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-100 border-slate-200 opacity-65'
                }`}
              >
                {(item.imageUrl || DEFAULT_MENU_IMAGES[item.name]) && (
                  <img
                    src={item.imageUrl || DEFAULT_MENU_IMAGES[item.name]}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="aspect-16/10 w-full object-cover"
                  />
                )}
                <div className="flex h-full flex-col p-4">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="wrap-break-word text-base font-semibold text-slate-900">
                        {item.name}
                      </h2>
                      <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                        {item.category}
                      </p>
                    </div>

                    {!item.isAvailable ? (
                      <span className="shrink-0 rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                        Unavailable
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        Available
                      </span>
                    )}
                  </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg font-bold text-slate-900">
                    &#8377;{Number(item.price).toFixed(2)}
                  </p>
                  {item.isAvailable && (
                    <button
                      type="button"
                      onClick={() => addItem(item)}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {cartItems.find((cartItem) => cartItem.menuItemId === item._id)
                        ? 'Add another'
                        : 'Add to cart'}
                    </button>
                  )}
                </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
