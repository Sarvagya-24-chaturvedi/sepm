import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import ErrorRetry from '../components/ErrorRetry';
import { STATUS_FLOW, formatDateTime } from '../utils/orderStatus';

const STATUS_OPTIONS = ['All', ...STATUS_FLOW];
const PAGE_LIMIT = 100;

const formatCurrency = (amount) =>
  `₹${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function RecordsPage() {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [dateError, setDateError] = useState('');

  // Filter state
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Validate date range on the client before making requests
  const validateDateRange = (start, end) => {
    if (start && end) {
      if (new Date(start) > new Date(end)) {
        return 'Start date cannot be after end date.';
      }
    }
    return '';
  };

  const fetchRecords = useCallback(
    async (isManualRefresh = false, targetPage = 1) => {
      // Validate date filters and prevent invalid requests from reaching the backend
      const validationMsg = validateDateRange(startDate, endDate);
      if (validationMsg) {
        setDateError(validationMsg);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      setDateError('');

      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError('');

      try {
        const params = {
          page: targetPage,
          limit: PAGE_LIMIT,
        };
        if (statusFilter && statusFilter !== 'All') {
          params.status = statusFilter;
        }
        if (startDate) {
          params.startDate = startDate;
        }
        if (endDate) {
          params.endDate = endDate;
        }

        const res = await api.get('/staff/records', { params });
        setRecords(res.data?.data || []);
        setTotal(res.data?.total ?? 0);
        setTotalRevenue(res.data?.totalRevenue ?? 0);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            (err.message === 'Network Error'
              ? 'Network error. Please check your connection and retry.'
              : 'Failed to load order records. Please try again.')
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, startDate, endDate]
  );

  // Trigger fetch when valid filters or page change
  useEffect(() => {
    const validationMsg = validateDateRange(startDate, endDate);
    if (validationMsg) {
      setDateError(validationMsg);
      return;
    }
    setDateError('');
    fetchRecords(false, page);
  }, [fetchRecords, page, startDate, endDate, statusFilter]);

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    setPage(1);
  };

  const handleStartDateChange = (e) => {
    const newStart = e.target.value;
    setStartDate(newStart);
    setPage(1);
    setDateError(validateDateRange(newStart, endDate));
  };

  const handleEndDateChange = (e) => {
    const newEnd = e.target.value;
    setEndDate(newEnd);
    setPage(1);
    setDateError(validateDateRange(startDate, newEnd));
  };

  const handleClearFilters = () => {
    setStatusFilter('All');
    setStartDate('');
    setEndDate('');
    setDateError('');
    setPage(1);
  };

  const hasActiveFilters = statusFilter !== 'All' || startDate !== '' || endDate !== '';
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const startIdx = total === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const endIdx = Math.min(page * PAGE_LIMIT, total);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Order Records</h1>
            <p className="mt-1 text-sm text-slate-600">
              Audit and track all historical and current canteen orders.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchRecords(true, page)}
            disabled={loading || refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
          >
            <svg
              className={`h-4 w-4 ${refreshing ? 'animate-spin text-amber-600' : 'text-slate-500'}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
              />
            </svg>
            <span>{refreshing ? 'Refreshing...' : 'Refresh Records'}</span>
          </button>
        </div>

        {/* Filters Card */}
        <section
          aria-label="Filter records"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {/* Status Filter */}
            <div>
              <label htmlFor="filter-status" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Status
              </label>
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status === 'All' ? 'All Statuses' : status}
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date Filter */}
            <div>
              <label htmlFor="filter-start-date" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                Start Date
              </label>
              <input
                id="filter-start-date"
                type="date"
                value={startDate}
                onChange={handleStartDateChange}
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  dateError
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:border-amber-500 focus:ring-amber-500'
                }`}
              />
            </div>

            {/* End Date Filter */}
            <div>
              <label htmlFor="filter-end-date" className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                End Date
              </label>
              <input
                id="filter-end-date"
                type="date"
                value={endDate}
                onChange={handleEndDateChange}
                className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  dateError
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500'
                    : 'border-slate-300 focus:border-amber-500 focus:ring-amber-500'
                }`}
              />
            </div>

            {/* Clear Filters Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Date Validation Alert */}
          {dateError && (
            <div
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-medium text-red-700"
            >
              {dateError}
            </div>
          )}
        </section>

        {/* Content Area */}
        {error ? (
          <ErrorRetry message={error} onRetry={() => fetchRecords(false, page)} />
        ) : loading ? (
          <div className="space-y-4">
            <div className="h-10 rounded-xl bg-slate-200 animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-200/70 animate-pulse" />
              ))}
            </div>
          </div>
        ) : records.length === 0 ? (
          <section className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
            <svg
              className="mx-auto h-12 w-12 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
              />
            </svg>
            <h2 className="mt-3 text-base font-semibold text-slate-800">No order records found</h2>
            <p className="mt-1 text-sm text-slate-500">
              {hasActiveFilters
                ? 'No orders match your filter criteria. Try adjusting or clearing the filters.'
                : 'There are currently no orders recorded in the system.'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="mt-4 inline-flex items-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Reset Filters
              </button>
            )}
          </section>
        ) : (
          <div className="space-y-4">
            {/* Results Meta & Global Filter Aggregates */}
            <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm">
              <div>
                <span className="font-medium text-slate-600">
                  {total === 0
                    ? 'Showing 0 records'
                    : `Showing ${startIdx}–${endIdx} of ${total} record${total === 1 ? '' : 's'}`}{' '}
                  <span className="text-slate-400 font-normal">(newest first)</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-slate-600">
                <div>
                  Total Matching Orders:{' '}
                  <strong className="font-bold text-slate-900">{total}</strong>
                </div>
                <div className="h-4 w-px bg-slate-200 hidden sm:block" />
                <div>
                  Total Revenue:{' '}
                  <strong className="font-bold text-emerald-700">{formatCurrency(totalRevenue)}</strong>
                </div>
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600">
                    <tr>
                      <th className="px-4 py-3.5">Order #</th>
                      <th className="px-4 py-3.5">Student</th>
                      <th className="px-4 py-3.5">Items</th>
                      <th className="px-4 py-3.5">Total Amount</th>
                      <th className="px-4 py-3.5">Placed At</th>
                      <th className="px-4 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {records.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/75 transition-colors align-top">
                        <td className="px-4 py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                          {order.orderNumber}
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="font-medium text-slate-900">
                            {order.studentName || order.student?.name || '-'}
                          </p>
                          {order.student?.email && (
                            <p className="text-xs text-slate-500">{order.student.email}</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <ul className="space-y-1">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((item, idx) => (
                                <li key={item.id || idx} className="text-slate-700 text-xs">
                                  <span className="font-medium">{item.name || item.itemName}</span>{' '}
                                  <span className="text-slate-500">× {item.quantity}</span>{' '}
                                  <span className="text-slate-400">({formatCurrency(item.subtotal)})</span>
                                </li>
                              ))
                            ) : (
                              <span className="text-slate-400 text-xs italic">No items</span>
                            )}
                          </ul>
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                          {formatDateTime(order.createdAt)}
                        </td>
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <StatusBadge status={order.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards View */}
            <div className="space-y-3 sm:hidden">
              {records.map((order) => (
                <article
                  key={order.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div>
                      <p className="font-bold text-slate-900">{order.orderNumber}</p>
                      <p className="text-xs text-slate-500">{formatDateTime(order.createdAt)}</p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="text-slate-500 font-medium">
                      Student:{' '}
                      <span className="font-semibold text-slate-800">
                        {order.studentName || order.student?.name || '-'}
                      </span>
                    </p>
                    {order.student?.email && (
                      <p className="text-slate-400">{order.student.email}</p>
                    )}
                  </div>

                  <div className="rounded-lg bg-slate-50 p-2.5 text-xs space-y-1">
                    <p className="font-semibold text-slate-600 uppercase tracking-wider text-[10px]">
                      Items Ordered
                    </p>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div key={item.id || idx} className="flex justify-between text-slate-700">
                          <span>
                            {item.name || item.itemName} × {item.quantity}
                          </span>
                          <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-slate-400 italic">No items</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-xs font-semibold uppercase text-slate-500">Total</span>
                    <span className="text-base font-bold text-slate-900">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </article>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <nav
                aria-label="Records pagination"
                className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 rounded-xl border shadow-2xs"
              >
                <div className="text-xs text-slate-600">
                  Page <span className="font-semibold text-slate-900">{page}</span> of{' '}
                  <span className="font-semibold text-slate-900">{totalPages}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading || refreshing}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    &larr; Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading || refreshing}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    Next &rarr;
                  </button>
                </div>
              </nav>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
