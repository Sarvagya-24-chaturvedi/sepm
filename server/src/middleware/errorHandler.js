const { ZodError } = require('zod');

function notFoundHandler(_req, res) {
  res.status(404).json({ message: 'Route not found' });
}

function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const errors = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({
      message: 'Validation failed',
      errors,
    });
  }

  if (err && err.name === 'CastError') {
    return res.status(404).json({ message: 'Resource not found' });
  }

  const status = err.statusCode || err.status || 500;
  const message = status >= 500 ? 'Internal server error' : err.message || 'Request failed';
  if (status >= 500) {
    console.error('Unhandled server error:', err.message);
  }
  return res.status(status).json({ message });
}

module.exports = { notFoundHandler, errorHandler };
