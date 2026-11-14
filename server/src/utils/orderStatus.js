// Single source of truth for the order status flow (FR-09, FR-10).
const STATUS_FLOW = ['Placed', 'Confirmed', 'Preparing', 'Ready', 'Completed'];

// Returns the only status an order may move to next, or null if it is final.
const nextStatus = (current) => {
  const i = STATUS_FLOW.indexOf(current);
  return i >= 0 && i < STATUS_FLOW.length - 1 ? STATUS_FLOW[i + 1] : null;
};

// Only a single forward step is valid: no skipping, no going backward.
const isValidTransition = (from, to) => nextStatus(from) === to;

module.exports = { STATUS_FLOW, nextStatus, isValidTransition };
