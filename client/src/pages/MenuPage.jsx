import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Layout from '../components/Layout';
import ErrorRetry from '../components/ErrorRetry';

export default function MenuPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
                className={`rounded-xl border p-4 transition-colors ${
                  item.isAvailable
                    ? 'bg-white border-slate-200 shadow-xs'
                    : 'bg-slate-100 border-slate-200 opacity-65'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      {item.name}
                    </h2>
                    <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                      {item.category}
                    </p>
                  </div>

                  {!item.isAvailable ? (
                    <span className="inline-flex items-center rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      Unavailable
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      Available
                    </span>
                  )}
                </div>

                <p className="mt-4 text-lg font-bold text-slate-900">
                  &#8377;{Number(item.price).toFixed(0)}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
