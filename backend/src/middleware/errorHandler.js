// backend/src/middleware/errorHandler.js

/**
 * Custom Error Class for API errors
 */
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error Handler Middleware
 * Catches all errors and sends appropriate response
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // Default to 500 server error if no status code
  if (!statusCode) {
    statusCode = 500;
  }

  // Log error details for debugging
  console.error('Error Details:', {
    statusCode,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Prepare response
  const response = {
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    })
  };

  // Handle specific error types
  
  // MongoDB CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    response.statusCode = 400;
    response.message = `Invalid ${err.path}: ${err.value}`;
  }

  // MongoDB Duplicate Key Error
  if (err.code === 11000) {
    response.statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    response.message = `Duplicate field value: ${field}. Please use another value.`;
  }

  // MongoDB Validation Error
  if (err.name === 'ValidationError') {
    response.statusCode = 400;
    const errors = Object.values(err.errors).map(e => e.message);
    response.message = `Invalid input data. ${errors.join('. ')}`;
  }

  // JWT Error
  if (err.name === 'JsonWebTokenError') {
    response.statusCode = 401;
    response.message = 'Invalid token. Please log in again.';
  }

  // JWT Expired Error
  if (err.name === 'TokenExpiredError') {
    response.statusCode = 401;
    response.message = 'Your token has expired. Please log in again.';
  }

  // Gemini API Error
  if (err.message && err.message.includes('Gemini')) {
    response.statusCode = 503;
    response.message = 'AI service temporarily unavailable. Please try again.';
  }

  // MongoDB Connection Error
  if (err.name === 'MongoNetworkError' || err.name === 'MongooseServerSelectionError') {
    response.statusCode = 503;
    response.message = 'Database connection failed. Please try again later.';
  }

  // Rate Limit Error
  if (err.message && err.message.includes('Too many requests')) {
    response.statusCode = 429;
    response.message = 'Too many requests. Please try again later.';
  }

  // Send error response
  res.status(response.statusCode).json(response);
};

/**
 * Not Found Error Handler
 * Handles 404 errors for undefined routes
 */
const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.originalUrl}`);
  next(error);
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors automatically
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation Error Handler
 * Creates validation error response
 */
const validationError = (errors) => {
  const messages = errors.map(err => err.msg).join(', ');
  return new ApiError(400, `Validation Error: ${messages}`);
};

module.exports = {
  ApiError,
  errorHandler,
  notFound,
  asyncHandler,
  validationError
};