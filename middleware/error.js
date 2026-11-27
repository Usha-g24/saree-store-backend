import HttpError from '../utils/HttpError.js';

export const notFound = (req, _res, next) => next(new HttpError(404, `Not found: ${req.method} ${req.originalUrl}`));

export const errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message;
  let errors;
  if (err.name === 'ZodError') {
    status = 400; message = 'Validation failed';
    errors = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err.name === 'CastError') {
    status = 400; message = `Invalid ${err.path}`;
  } else if (err.name === 'ValidationError') {
    status = 400; message = Object.values(err.errors).map((e) => e.message).join(', ');
  } else if (err.code === 11000) {
    status = 409; message = `${Object.keys(err.keyValue || {})[0] || 'value'} already exists`;
  } else if (err.name === 'MulterError') {
    status = 400;
  }
  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Server error' : message,
    ...(errors && { errors }),
  });
};
