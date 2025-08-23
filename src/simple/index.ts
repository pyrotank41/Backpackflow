/**
 * Simple API for BackpackFlow
 * 
 * This provides an ultra-simple interface for beginners and tutorials.
 * Under the hood, it uses the full professional architecture, but hides
 * the complexity behind a clean, easy-to-use API.
 * 
 * Perfect for:
 * - Learning materials
 * - Quick prototypes  
 * - Getting started tutorials
 * 
 * For production use, import from the main package for full control.
 */

import { SimpleChatFlow, ChatStorage, LLMProviderFactory } from '../index';

/**
 * Simple conversation state that hides complexity
 */
export class SimpleChat {
    private storage: ChatStorage;

    constructor(systemPrompt?: string) {
        this.storage = SimpleChatFlow.createConversation(systemPrompt);
    }

    /**
     * Ask a question and get a response
     */
    async ask(message: string): Promise<string> {
        return await SimpleChatFlow.sendMessage(this.storage, message);
    }

    /**
     * Get the conversation history in a simple format
     */
    getHistory(): Array<{ role: string; message: string }> {
        return this.storage.messages.map(msg => ({
            role: msg.role,
            message: msg.content
        }));
    }

    /**
     * Clear the conversation
     */
    clear(): void {
        this.storage.messages = [];
    }

    /**
     * Static method for one-shot questions (no conversation memory)
     */
    static async ask(message: string): Promise<string> {
        const chat = new SimpleChat();
        return await chat.ask(message);
    }

    /**
     * Static method to create a chat with a role/personality
     */
    static withRole(role: string): SimpleChat {
        const systemPrompt = `You are ${role}. Respond in character.`;
        return new SimpleChat(systemPrompt);
    }
}

/**
 * Even simpler: just export a function for one-liners
 */
export async function ask(message: string): Promise<string> {
    return await SimpleChat.ask(message);
}

/**
 * Create a conversational AI with a specific role
 */
export function createAI(role?: string): SimpleChat {
    if (role) {
        return SimpleChat.withRole(role);
    }
    return new SimpleChat();
}

// Export everything for convenience
export { SimpleChat as default };
