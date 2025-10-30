// backend/src/models/Conversation.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  emotion: String, // detected emotion: happy, sad, excited, neutral, etc.
  extractedInfo: {
    type: Map,
    of: String
  } // key-value pairs of extracted information
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  messages: [messageSchema],
  summary: String, // AI-generated summary for long-term memory
  topics: [String], // discussed topics
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
conversationSchema.index({ userId: 1, sessionId: 1 });
conversationSchema.index({ userId: 1, isActive: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);