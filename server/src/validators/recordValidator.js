const { z } = require('zod');
const { STATUS_FLOW } = require('../utils/orderStatus');

const ALLOWED_STATUSES = ['All', ...STATUS_FLOW];

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds

/**
 * Safely parse a date string into a Date object.
 * If format is YYYY-MM-DD, set to start-of-day (00:00:00.000+05:30) or end-of-day (23:59:59.999+05:30) in Asia/Kolkata (IST).
 * Preserves support for existing ISO date-time strings.
 */
function parseDate(val, isEndOfDay = false) {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    const timePart = isEndOfDay ? 'T23:59:59.999+05:30' : 'T00:00:00.000+05:30';
    const parsed = new Date(`${trimmed}${timePart}`);
    if (isNaN(parsed.getTime())) return null;

    // Verify calendar date validity in IST (guards against rollover like Feb 31 -> March 3)
    const istTime = new Date(parsed.getTime() + IST_OFFSET_MS);
    if (
      istTime.getUTCFullYear() !== y ||
      istTime.getUTCMonth() + 1 !== m ||
      istTime.getUTCDate() !== d
    ) {
      return null;
    }
    return parsed;
  }

  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

const recordQuerySchema = z
  .object({
    status: z
      .string()
      .optional()
      .transform((val) => (val && val.trim() ? val.trim() : undefined))
      .refine(
        (val) => !val || val.toLowerCase() === 'all' || STATUS_FLOW.includes(val),
        {
          message: `Invalid status filter. Allowed values: All, ${STATUS_FLOW.join(', ')}`,
        }
      ),
    startDate: z
      .string()
      .optional()
      .transform((val) => (val && val.trim() ? val.trim() : undefined))
      .refine(
        (val) => {
          if (!val) return true;
          return parseDate(val, false) !== null;
        },
        { message: 'Invalid startDate. Must be a valid date (e.g. YYYY-MM-DD or ISO timestamp)' }
      ),
    endDate: z
      .string()
      .optional()
      .transform((val) => (val && val.trim() ? val.trim() : undefined))
      .refine(
        (val) => {
          if (!val) return true;
          return parseDate(val, true) !== null;
        },
        { message: 'Invalid endDate. Must be a valid date (e.g. YYYY-MM-DD or ISO timestamp)' }
      ),
    limit: z
      .preprocess(
        (val) => (val !== undefined && val !== '' ? Number(val) : undefined),
        z
          .number({ invalid_type_error: 'Limit must be a number' })
          .int('Limit must be an integer')
          .min(1, 'Limit must be at least 1')
          .max(200, 'Limit cannot exceed 200')
          .optional()
      ),
    page: z
      .preprocess(
        (val) => (val !== undefined && val !== '' ? Number(val) : undefined),
        z
          .number({ invalid_type_error: 'Page must be a number' })
          .int('Page must be an integer')
          .min(1, 'Page must be at least 1')
          .optional()
      ),
  })
  .superRefine((data, ctx) => {
    if (data.startDate && data.endDate) {
      const start = parseDate(data.startDate, false);
      const end = parseDate(data.endDate, true);
      if (start && end && start.getTime() > end.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['startDate'],
          message: 'Start date cannot be after end date',
        });
      }
    }
  });

module.exports = {
  recordQuerySchema,
  parseDate,
  ALLOWED_STATUSES,
};
