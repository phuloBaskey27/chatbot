// backend/src/models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  profile: {
    name: String,
    preferences: {
      topics: [String],
      interests: [String],
      favoriteColor: String,
      location: String,
      occupation: String,
    },
    personality: {
      communicationStyle: String, // casual, formal, friendly
      moodHistory: [String],
    }
  },
  memoryKeywords: [String], // For quick lookup
  lastInteraction: {
    type: Date,
    default: Date.now
  },
  totalInteractions: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Add index for faster queries
userSchema.index({ userId: 1, lastInteraction: -1 });

module.exports = mongoose.model('User', userSchema);