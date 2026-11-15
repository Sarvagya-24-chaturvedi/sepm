const { recordQuerySchema, parseDate } = require('./recordValidator');

describe('recordQuerySchema & parseDate (IST Date Handling)', () => {
  describe('IST Calendar Day Boundaries (Bug 1)', () => {
    test('start of an IST calendar day starts at 00:00:00.000+05:30 (18:30:00.000Z previous day)', () => {
      const start = parseDate('2026-11-15', false);
      expect(start).not.toBeNull();
      expect(start.toISOString()).toBe('2026-11-14T18:30:00.000Z');
    });

    test('end of an IST calendar day ends at 23:59:59.999+05:30 (18:29:59.999Z current day)', () => {
      const end = parseDate('2026-11-15', true);
      expect(end).not.toBeNull();
      expect(end.toISOString()).toBe('2026-11-15T18:29:59.999Z');
    });

    test('correctly includes orders around midnight in IST date range', () => {
      const start = parseDate('2026-11-15', false);
      const end = parseDate('2026-11-15', true);

      // Order placed 1 minute after midnight on Nov 15 IST (Nov 14 18:31 UTC)
      const justAfterMidnightIST = new Date('2026-11-14T18:31:00.000Z');
      expect(justAfterMidnightIST >= start && justAfterMidnightIST <= end).toBe(true);

      // Order placed 1 minute before midnight at the end of Nov 15 IST (Nov 15 18:29 UTC)
      const justBeforeMidnightIST = new Date('2026-11-15T18:29:00.000Z');
      expect(justBeforeMidnightIST >= start && justBeforeMidnightIST <= end).toBe(true);

      // Order placed 1 minute before Nov 15 IST starts (Nov 14 18:29 UTC)
      const justBeforeNov15IST = new Date('2026-11-14T18:29:00.000Z');
      expect(justBeforeNov15IST >= start).toBe(false);

      // Order placed 1 minute after Nov 15 IST ends (Nov 15 18:31 UTC = Nov 16 00:01 IST)
      const justAfterNov15IST = new Date('2026-11-15T18:31:00.000Z');
      expect(justAfterNov15IST <= end).toBe(false);
    });

    test('preserves support for explicit ISO date-time strings', () => {
      const isoDate = '2026-11-15T10:00:00.000Z';
      const parsed = parseDate(isoDate);
      expect(parsed).not.toBeNull();
      expect(parsed.toISOString()).toBe(isoDate);
    });

    test('rejects calendar-invalid dates such as Feb 31', () => {
      expect(parseDate('2026-02-31', false)).toBeNull();
      expect(parseDate('2026-02-29', false)).toBeNull(); // 2026 is not a leap year
      expect(parseDate('2024-02-29', false)).not.toBeNull(); // 2024 is a leap year
      expect(parseDate('2026-13-01', false)).toBeNull();
    });
  });

  describe('Query parameter validation rules', () => {
    test('accepts valid empty or missing query params', () => {
      const parsed = recordQuerySchema.safeParse({});
      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual({
        status: undefined,
        startDate: undefined,
        endDate: undefined,
        limit: undefined,
        page: undefined,
      });
    });

    test('accepts status "All" or lowercase "all"', () => {
      expect(recordQuerySchema.safeParse({ status: 'All' }).success).toBe(true);
      expect(recordQuerySchema.safeParse({ status: 'all' }).success).toBe(true);
    });

    test.each(['Placed', 'Confirmed', 'Preparing', 'Ready', 'Completed'])(
      'accepts valid status %p',
      (status) => {
        const result = recordQuerySchema.safeParse({ status });
        expect(result.success).toBe(true);
        expect(result.data.status).toBe(status);
      }
    );

    test.each(['Cancelled', 'InvalidStatus', 'pending', 'active'])(
      'rejects invalid status %p',
      (status) => {
        const result = recordQuerySchema.safeParse({ status });
        expect(result.success).toBe(false);
        expect(result.error.issues[0].message).toMatch(/Invalid status filter/);
      }
    );

    test('accepts valid YYYY-MM-DD dates in IST', () => {
      const result = recordQuerySchema.safeParse({
        startDate: '2026-11-01',
        endDate: '2026-11-15',
      });
      expect(result.success).toBe(true);
    });

    test('accepts same-day startDate and endDate in IST', () => {
      const result = recordQuerySchema.safeParse({
        startDate: '2026-11-15',
        endDate: '2026-11-15',
      });
      expect(result.success).toBe(true);
    });

    test('accepts valid ISO timestamp dates', () => {
      const result = recordQuerySchema.safeParse({
        startDate: '2026-11-01T00:00:00.000Z',
        endDate: '2026-11-15T23:59:59.999Z',
      });
      expect(result.success).toBe(true);
    });

    test('rejects malformed startDate', () => {
      const result = recordQuerySchema.safeParse({ startDate: 'not-a-date' });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toMatch(/Invalid startDate/);
    });

    test('rejects malformed endDate', () => {
      const result = recordQuerySchema.safeParse({ endDate: 'invalid-date' });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toMatch(/Invalid endDate/);
    });

    test('rejects when startDate is after endDate', () => {
      const result = recordQuerySchema.safeParse({
        startDate: '2026-11-20',
        endDate: '2026-11-10',
      });
      expect(result.success).toBe(false);
      expect(result.error.issues[0].message).toBe('Start date cannot be after end date');
    });

    test('coerces and validates valid limit and page', () => {
      const result = recordQuerySchema.safeParse({
        limit: '50',
        page: '2',
      });
      expect(result.success).toBe(true);
      expect(result.data.limit).toBe(50);
      expect(result.data.page).toBe(2);
    });

    test.each([0, -5, 201, 1000])('rejects out of range limit %p', (limit) => {
      const result = recordQuerySchema.safeParse({ limit });
      expect(result.success).toBe(false);
    });
  });
});
