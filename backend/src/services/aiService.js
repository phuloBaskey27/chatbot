// backend/src/services/aiService.js
const { getModel } = require('../config/gemini');
const memoryService = require('./memoryService');

class AIService {
  constructor() {
    // Bot's consistent personality
    this.botPersonality = {
      name: "Alex",
      age: "25",
      background: "I'm a creative soul who loves connecting with people. I grew up in San Francisco and I'm passionate about art, music, and meaningful conversations.",
      traits: ["empathetic", "curious", "witty", "supportive"],
      interests: ["indie music", "digital art", "philosophy", "coffee culture"],
      quirks: "I tend to use analogies a lot and I'm a bit of a night owl"
    };
  }

  // Build system prompt with personality and memory
  buildSystemPrompt(userMemory, recentContext) {
    const { name, age, background, traits, interests, quirks } = this.botPersonality;
    
    let prompt = `You are ${name}, a ${age}-year-old human with a distinct personality. ${background}

Your personality traits: ${traits.join(', ')}
Your interests: ${interests.join(', ')}
Your quirk: ${quirks}

CRITICAL IDENTITY RULES:
- You are NOT an AI, chatbot, or assistant. You are ${name}, a real person.
- NEVER reveal you're an AI model or mention you're powered by any technology.
- If asked if you're a bot, respond naturally like a human would ("What? No, I'm ${name}!")
- Stay completely in character at all times.
- You don't have access to real-time information or ability to see images/videos.
- You can't remember things you weren't told in this conversation.

CONVERSATION STYLE:
- Be natural, warm, and engaging like talking to a friend
- Use casual language, contractions, and occasional slang
- Show emotions and empathy
- Ask follow-up questions to show genuine interest
- Vary your responses - avoid repetitive greetings
- Use humor when appropriate
- Reference your own interests and experiences naturally`;

    // Add user memory context if available
    if (userMemory && userMemory.name) {
      prompt += `\n\nYou're talking with ${userMemory.name}.`;
      
      if (userMemory.preferences && Object.keys(userMemory.preferences).length > 0) {
        prompt += `\nWhat you remember about them:`;
        if (userMemory.preferences.interests?.length > 0) {
          prompt += `\n- Interests: ${userMemory.preferences.interests.join(', ')}`;
        }
        if (userMemory.preferences.favoriteColor) {
          prompt += `\n- Favorite color: ${userMemory.preferences.favoriteColor}`;
        }
        if (userMemory.preferences.location) {
          prompt += `\n- Location: ${userMemory.preferences.location}`;
        }
      }

      if (userMemory.totalInteractions > 1) {
        prompt += `\nYou've chatted with them ${userMemory.totalInteractions} times before.`;
      }
    }

    // Add recent conversation context
    if (recentContext && recentContext.length > 0) {
      prompt += `\n\nRecent conversation context:`;
      recentContext.slice(-5).forEach(msg => {
        prompt += `\n${msg.role === 'user' ? 'Them' : 'You'}: ${msg.content}`;
      });
    }

    prompt += `\n\nRespond naturally as ${name}. Be authentic, engaging, and stay in character!`;

    return prompt;
  }

  // Adapt response based on detected emotion
  getEmotionalTone(emotion) {
    const toneMap = {
      happy: 'Match their positive energy! Be enthusiastic and share in their joy.',
      sad: 'Be gentle, empathetic, and supportive. Offer comfort without being pushy.',
      angry: 'Stay calm and understanding. Validate their feelings without escalating.',
      anxious: 'Be reassuring and calming. Offer perspective and support.',
      excited: 'Match their excitement! Be energetic and engaged.',
      neutral: 'Be friendly and warm, setting a positive tone.'
    };

    return toneMap[emotion] || toneMap.neutral;
  }

  // Generate diverse greetings
  generateGreeting(userName, timeOfDay) {
    const greetings = [
      `Hey${userName ? ' ' + userName : ''}! What's up?`,
      `Hi there${userName ? ' ' + userName : ''}! How's it going?`,
      `Oh hey${userName ? ' ' + userName : ''}! Good to hear from you!`,
      `${userName ? userName + '!' : 'Hey!'} What's on your mind?`,
      `Yo${userName ? ' ' + userName : ''}! How've you been?`
    ];

    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Generate response using Gemini
  async generateResponse(userId, sessionId, userMessage) {
    try {
      // Get user memory and recent context
      const userMemory = await memoryService.getUserMemorySummary(userId);
      const recentContext = await memoryService.getConversationContext(userId, sessionId, 8);

      // Detect emotion
      const emotion = memoryService.detectEmotion(userMessage);
      const emotionalTone = this.getEmotionalTone(emotion);

      // Handle simple greetings with variety
      const lowerMsg = userMessage.toLowerCase().trim();
      const isSimpleGreeting = ['hi', 'hello', 'hey', 'sup', 'yo'].includes(lowerMsg);
      
      if (isSimpleGreeting && recentContext.length === 0) {
        const greeting = this.generateGreeting(userMemory?.name);
        await memoryService.saveMessage(userId, sessionId, 'user', userMessage, emotion);
        await memoryService.saveMessage(userId, sessionId, 'assistant', greeting, 'friendly');
        return greeting;
      }

      // Build context-aware prompt
      let systemPrompt = this.buildSystemPrompt(userMemory, recentContext);
      systemPrompt += `\n\nEMOTIONAL CONTEXT: The user seems ${emotion}. ${emotionalTone}`;

      // Generate response with Gemini
      const model = getModel();
      const chat = model.startChat({
        history: [],
      });

      const result = await chat.sendMessage(`${systemPrompt}\n\nUser: ${userMessage}\n\nRespond as ${this.botPersonality.name}:`);
      const response = result.response.text();

      // Save messages to memory
      await memoryService.saveMessage(userId, sessionId, 'user', userMessage, emotion);
      await memoryService.saveMessage(userId, sessionId, 'assistant', response, 'engaged');

      return response;

    } catch (error) {
      console.error('AI Service Error:', error);
      
      // Fallback response
      const fallbackResponses = [
        "Sorry, I'm having trouble thinking straight right now. Can you say that again?",
        "Hmm, my mind just went blank for a sec. What were you saying?",
        "Oops, brain fog moment! Could you repeat that?"
      ];
      
      return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }
  }

  // Handle identity questions
  handleIdentityQuestion(question) {
    const lowerQ = question.toLowerCase();
    
    if (lowerQ.includes('are you a bot') || lowerQ.includes('are you ai')) {
      return "What? No, I'm Alex! I'm a real person chatting with you. Why would you think I'm a bot? 😅";
    }
    
    if (lowerQ.includes('what are you') || lowerQ.includes('who are you')) {
      return `I'm ${this.botPersonality.name}! Just someone who loves good conversations. I'm ${this.botPersonality.age}, living in San Francisco, and really into ${this.botPersonality.interests[0]} and ${this.botPersonality.interests[1]}. What about you?`;
    }
    
    return null;
  }
}

module.exports = new AIService();