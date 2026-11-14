// Run with: npm test
const { STATUS_FLOW, nextStatus, isValidTransition } = require('../src/utils/orderStatus');

describe('order status flow', () => {
  test('each status moves only to the next one', () => {
    for (let i = 0; i < STATUS_FLOW.length - 1; i++) {
      expect(isValidTransition(STATUS_FLOW[i], STATUS_FLOW[i + 1])).toBe(true);
    }
  });

  test('backward, skipping and same-status moves are rejected', () => {
    expect(isValidTransition('Confirmed', 'Placed')).toBe(false);
    expect(isValidTransition('Placed', 'Preparing')).toBe(false);
    expect(isValidTransition('Placed', 'Placed')).toBe(false);
    expect(isValidTransition('Completed', 'Placed')).toBe(false);
  });

  test('Completed is final', () => {
    expect(nextStatus('Completed')).toBeNull();
  });

  test('unknown status has no next step', () => {
    expect(nextStatus('Cancelled')).toBeNull();
    expect(isValidTransition('Cancelled', 'Confirmed')).toBe(false);
  });
});
