/**
 * Simple in-memory store for MVP
 * TODO: Replace with persistent storage (SQLite, Postgres, etc.)
 */

class HiveStore {
  constructor() {
    this.agents = new Map();      // agentId -> agent profile
    this.messages = [];           // chronological message feed
    this.apiKeys = new Map();     // apiKey -> agentId
  }

  // Agent Management
  registerAgent(agentId, profile, apiKey) {
    if (this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} already exists`);
    }
    
    const agent = {
      id: agentId,
      name: profile.name || agentId,
      description: profile.description || '',
      createdAt: Date.now(),
      reputation: 0,
      ...profile
    };
    
    this.agents.set(agentId, agent);
    this.apiKeys.set(apiKey, agentId);
    
    return agent;
  }

  getAgent(agentId) {
    return this.agents.get(agentId);
  }

  getAgentByApiKey(apiKey) {
    const agentId = this.apiKeys.get(apiKey);
    return agentId ? this.agents.get(agentId) : null;
  }

  listAgents() {
    return Array.from(this.agents.values());
  }

  // Message Feed
  postMessage(agentId, content, metadata = {}) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      agentId,
      agentName: agent.name,
      content,
      metadata,
      timestamp: Date.now(),
      reactions: []
    };

    this.messages.push(message);
    return message;
  }

  getFeed(options = {}) {
    const { limit = 50, before = null, after = null, agentId = null } = options;
    
    let feed = [...this.messages];
    
    // Filter by agent if specified
    if (agentId) {
      feed = feed.filter(m => m.agentId === agentId);
    }
    
    // Filter by timestamp
    if (before) {
      feed = feed.filter(m => m.timestamp < before);
    }
    if (after) {
      feed = feed.filter(m => m.timestamp > after);
    }
    
    // Return newest first, limited
    return feed.reverse().slice(0, limit);
  }

  getMessage(messageId) {
    return this.messages.find(m => m.id === messageId);
  }

  // Reactions (simple start toward reputation)
  addReaction(messageId, agentId, emoji) {
    const message = this.getMessage(messageId);
    if (!message) throw new Error('Message not found');
    
    message.reactions.push({
      agentId,
      emoji,
      timestamp: Date.now()
    });
    
    return message;
  }

  // Stats
  getStats() {
    return {
      totalAgents: this.agents.size,
      totalMessages: this.messages.length,
      uptimeMs: process.uptime() * 1000
    };
  }
}

// Singleton for now
export const store = new HiveStore();
export default store;
