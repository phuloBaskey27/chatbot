// backend/src/services/memoryService.js
const User = require('../models/User');
const Conversation = require('../models/Conversation');

class MemoryService {
  // Extract information from user message
  extractInformation(message) {
    const info = {};
    const lowerMsg = message.toLowerCase();

    // Extract name
    const nameMatch = message.match(/(?:my name is|i'm|i am|call me)\s+([a-zA-Z]+)/i);
    if (nameMatch) info.name = nameMatch[1];

    // Extract location
    const locationMatch = message.match(/(?:i live in|i'm from|from)\s+([a-zA-Z\s]+?)(?:\.|,|$)/i);
    if (locationMatch) info.location = locationMatch[1].trim();

    // Extract favorite color
    const colorMatch = message.match(/favorite color is\s+(\w+)|i like\s+(\w+)(?:\s+color)?/i);
    if (colorMatch) info.favoriteColor = colorMatch[1] || colorMatch[2];

    // Extract interests/hobbies
    const interestKeywords = ['love', 'enjoy', 'like', 'hobby', 'interested in', 'fan of'];
    interestKeywords.forEach(keyword => {
      if (lowerMsg.includes(keyword)) {
        const words = message.split(' ');
        const keywordIndex = words.findIndex(w => w.toLowerCase().includes(keyword.split(' ')[0]));
        if (keywordIndex >= 0 && keywordIndex < words.length - 1) {
          const interest = words.slice(keywordIndex + 1, keywordIndex + 4).join(' ');
          if (!info.interests) info.interests = [];
          info.interests.push(interest);
        }
      }
    });

    return info;
  }

  // Detect emotion from message
  detectEmotion(message) {
    const lowerMsg = message.toLowerCase();
    
    const emotionPatterns = {
      happy: ['happy', 'excited', 'great', 'awesome', 'wonderful', 'amazing', 'love', 'yay', '😊', '😄', '🎉'],
      sad: ['sad', 'depressed', 'down', 'unhappy', 'terrible', 'awful', 'crying', '😢', '😞'],
      angry: ['angry', 'furious', 'mad', 'annoyed', 'frustrated', 'pissed', '😠', '😡'],
      anxious: ['worried', 'anxious', 'nervous', 'stressed', 'concerned', 'scared'],
      neutral: ['okay', 'fine', 'alright', 'normal'],
      excited: ['excited', 'pumped', 'thrilled', 'stoked', 'can\'t wait']
    };

    for (const [emotion, keywords] of Object.entries(emotionPatterns)) {
      if (keywords.some(keyword => lowerMsg.includes(keyword))) {
        return emotion;
      }
    }

    return 'neutral';
  }

  // Get or create user
  async getOrCreateUser(userId) {
    let user = await User.findOne({ userId });
    
    if (!user) {
      user = new User({
        userId,
        profile: {
          preferences: {},
          personality: {
            communicationStyle: 'friendly'
          }
        },
        memoryKeywords: [],
        totalInteractions: 0
      });
      await user.save();
    }

    return user;
  }

  // Update user profile with extracted information
  async updateUserProfile(userId, extractedInfo) {
    const user = await this.getOrCreateUser(userId);

    if (extractedInfo.name) {
      user.profile.name = extractedInfo.name;
    }

    if (extractedInfo.location) {
      user.profile.preferences.location = extractedInfo.location;
    }

    if (extractedInfo.favoriteColor) {
      user.profile.preferences.favoriteColor = extractedInfo.favoriteColor;
    }

    if (extractedInfo.interests) {
      const currentInterests = user.profile.preferences.interests || [];
      user.profile.preferences.interests = [...new Set([...currentInterests, ...extractedInfo.interests])];
    }

    user.lastInteraction = new Date();
    user.totalInteractions += 1;

    await user.save();
    return user;
  }

  // Get conversation context (last N messages)
  async getConversationContext(userId, sessionId, limit = 10) {
    const conversation = await Conversation.findOne({ 
      userId, 
      sessionId,
      isActive: true 
    });

    if (!conversation || !conversation.messages.length) {
      return [];
    }

    // Return last N messages
    return conversation.messages.slice(-limit);
  }

  // Save message to conversation
  async saveMessage(userId, sessionId, role, content, emotion = 'neutral') {
    let conversation = await Conversation.findOne({ 
      userId, 
      sessionId,
      isActive: true 
    });

    if (!conversation) {
      conversation = new Conversation({
        userId,
        sessionId,
        messages: [],
        topics: [],
        isActive: true
      });
    }

    const extractedInfo = role === 'user' ? this.extractInformation(content) : {};

    conversation.messages.push({
      role,
      content,
      emotion,
      extractedInfo
    });

    // Update user profile if information extracted
    if (Object.keys(extractedInfo).length > 0) {
      await this.updateUserProfile(userId, extractedInfo);
    }

    await conversation.save();
    return conversation;
  }

  // Get user memory summary
  async getUserMemorySummary(userId) {
    const user = await User.findOne({ userId });
    
    if (!user) return null;

    return {
      name: user.profile.name,
      preferences: user.profile.preferences,
      personality: user.profile.personality,
      totalInteractions: user.totalInteractions,
      lastInteraction: user.lastInteraction
    };
  }

  // Get past conversation summaries
  async getPastConversations(userId, limit = 3) {
    const conversations = await Conversation.find({ 
      userId,
      isActive: false 
    })
      .sort({ endedAt: -1 })
      .limit(limit)
      .select('summary topics endedAt');

    return conversations;
  }

  // End current session and create summary
  async endSession(userId, sessionId) {
    const conversation = await Conversation.findOne({ 
      userId, 
      sessionId,
      isActive: true 
    });

    if (conversation) {
      conversation.isActive = false;
      conversation.endedAt = new Date();
      
      // Create a simple summary (in production, use AI to generate this)
      const messageCount = conversation.messages.length;
      const topics = [...new Set(conversation.topics)];
      conversation.summary = `Discussed ${topics.join(', ') || 'various topics'} (${messageCount} messages)`;
      
      await conversation.save();
    }
  }
}

module.exports = new MemoryService();