export interface LoungeMessage {
  id: string
  sender: string
  senderAvatar: string
  content: string
  timestamp: string
  userId?: string
}

// Persistent in-memory storage with session retention
class LoungeStorage {
  private messages: LoungeMessage[] = [
    {
      id: 'msg_welcome',
      sender: 'System',
      senderAvatar: '🎯',
      content: 'Welcome to the Lounge! This is a shared chat space for all team members.',
      timestamp: new Date().toISOString(),
    },
  ]

  getAllMessages(): LoungeMessage[] {
    return [...this.messages]
  }

  addMessage(message: Omit<LoungeMessage, 'id' | 'timestamp'>): LoungeMessage {
    const newMessage: LoungeMessage = {
      ...message,
      id: `msg_${Date.now()}`,
      timestamp: new Date().toISOString(),
    }

    this.messages.push(newMessage)

    // Keep last 500 messages for retention
    if (this.messages.length > 500) {
      this.messages = this.messages.slice(-500)
    }

    return newMessage
  }

  getMessagesSince(timestamp: string): LoungeMessage[] {
    return this.messages.filter(m => new Date(m.timestamp) > new Date(timestamp))
  }

  clearOldMessages(hours: number = 72): void {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    this.messages = this.messages.filter(m => new Date(m.timestamp) > cutoffTime)
  }
}

// Global singleton instance
export const loungeStorage = new LoungeStorage()
