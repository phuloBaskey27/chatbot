// backend/src/middleware/validation.js

const { ApiError } = require('./errorHandler');

/**
 * Sanitize user input to prevent injection attacks
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .trim();
};

/**
 * Validate message request
 */
const validateMessage = (req, res, next) => {
  const { userId, sessionId, message } = req.body;

  // Check for required fields
  if (!userId || !sessionId || !message) {
    throw new ApiError(400, 'Missing required fields: userId, sessionId, message');
  }

  // Validate types
  if (typeof userId !== 'string' || typeof sessionId !== 'string' || typeof message !== 'string') {
    throw new ApiError(400, 'Invalid field types. All fields must be strings.');
  }

  // Validate message length
  if (message.trim().length === 0) {
    throw new ApiError(400, 'Message cannot be empty');
  }

  if (message.length > 5000) {
    throw new ApiError(400, 'Message too long. Maximum 5000 characters allowed.');
  }

  // Sanitize inputs
  req.body.userId = sanitizeInput(userId);
  req.body.sessionId = sanitizeInput(sessionId);
  req.body.message = sanitizeInput(message);

  next();
};

/**
 * Validate userId parameter
 */
const validateUserId = (req, res, next) => {
  const { userId } = req.params;

  if (!userId) {
    throw new ApiError(400, 'User ID is required');
  }

  if (typeof userId !== 'string' || userId.trim().length === 0) {
    throw new ApiError(400, 'Invalid User ID');
  }

  req.params.userId = sanitizeInput(userId);
  next();
};

/**
 * Validate session parameters
 */
const validateSession = (req, res, next) => {
  const { userId, sessionId } = req.params;

  if (!userId || !sessionId) {
    throw new ApiError(400, 'User ID and Session ID are required');
  }

  if (typeof userId !== 'string' || typeof sessionId !== 'string') {
    throw new ApiError(400, 'Invalid parameter types');
  }

  req.params.userId = sanitizeInput(userId);
  req.params.sessionId = sanitizeInput(sessionId);
  next();
};

/**
 * Rate limiting validation helper
 */
const validateRateLimit = (req, res, next) => {
  // Additional rate limiting logic can go here
  // The express-rate-limit package handles most of this
  next();
};

/**
 * Validate request body size
 */
const validateBodySize = (req, res, next) => {
  const contentLength = req.headers['content-length'];
  
  if (contentLength && parseInt(contentLength) > 10000) {
    throw new ApiError(413, 'Request body too large. Maximum 10KB allowed.');
  }
  
  next();
};

module.exports = {
  sanitizeInput,
  validateMessage,
  validateUserId,
  validateSession,
  validateRateLimit,
  validateBodySize
};