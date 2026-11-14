export const STATUS_FLOW = ['Placed', 'Confirmed', 'Preparing', 'Ready', 'Completed'];

export const nextStatus = (s) => {
  const i = STATUS_FLOW.indexOf(s);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
};

// Full class strings (not built dynamically) so Tailwind keeps them.
export const STATUS_STYLES = {
  Placed: 'bg-gray-100 text-gray-700',
  Confirmed: 'bg-blue-100 text-blue-700',
  Preparing: 'bg-amber-100 text-amber-800',
  Ready: 'bg-green-100 text-green-700',
  Completed: 'bg-emerald-600 text-white',
};

export const formatDateTime = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';
