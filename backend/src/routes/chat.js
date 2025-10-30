// backend/src/routes/chat.js
const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const memoryService = require('../services/memoryService');
const { asyncHandler, ApiError } = require('../middleware/errorHandler');
const { validateMessage, validateUserId, validateSession } = require('../middleware/validation');

// Send a message
router.post('/message', validateMessage, asyncHandler(async (req, res) => {
    const { userId, sessionId, message } = req.body;

    if (!userId || !sessionId || !message) {
      throw new ApiError(400, 'Missing required fields: userId, sessionId, message');
    }

    // Check for identity questions first
    const identityResponse = aiService.handleIdentityQuestion(message);
    
    let response;
    if (identityResponse) {
      response = identityResponse;
      // Still save to memory
      await memoryService.saveMessage(userId, sessionId, 'user', message, 'curious');
      await memoryService.saveMessage(userId, sessionId, 'assistant', response, 'confident');
    } else {
      // Generate AI response
      response = await aiService.generateResponse(userId, sessionId, message);
    }

    res.json({ 
      response,
      timestamp: new Date()
    });
}));

// Get user profile
router.get('/profile/:userId', asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const profile = await memoryService.getUserMemorySummary(userId);
    
    res.json({ profile });
}));

// Get conversation history
router.get('/history/:userId/:sessionId', asyncHandler(async (req, res) => {
    const { userId, sessionId } = req.params;
    const messages = await memoryService.getConversationContext(userId, sessionId, 50);
    
    res.json({ messages });
}));

// Start new session
router.post('/session/start', asyncHandler(async (req, res) => {
    const { userId } = req.body;
    
    if (!userId) {
      throw new ApiError(400, 'Missing required field: userId');
    }
    
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({ sessionId });
}));

// End session
router.post('/session/end', asyncHandler(async (req, res) => {
    const { userId, sessionId } = req.body;
    
    if (!userId || !sessionId) {
      throw new ApiError(400, 'Missing required fields: userId, sessionId');
    }
    
    await memoryService.endSession(userId, sessionId);
    
    res.json({ message: 'Session ended successfully' });
}));

// Clear user data (for testing)
router.delete('/user/:userId', asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const User = require('../models/User');
    const Conversation = require('../models/Conversation');
    
    await User.deleteMany({ userId });
    await Conversation.deleteMany({ userId });
    
    res.json({ message: 'User data cleared successfully' });
}));

module.exports = router;