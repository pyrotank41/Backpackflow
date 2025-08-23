import { Node } from '../../pocketflow';
import { LLMProvider, LLMMessage, LLMConfig } from '../../providers';

/**
 * Simple Chat Node for BackpackFlow
 * 
 * A provider-agnostic LLM integration node that handles single-turn conversations.
 * Works with OpenAI, Anthropic, or any LLM provider that implements the LLMProvider interface.
 * 
 * This is the foundational building block for more complex chat patterns.
 * 
 * Limitations (by design):
 * - No streaming support
 * - No tool calling
 * - No advanced context management
 * - Single message per node execution
 * 
 * For advanced features, use AdvancedChatNode or StreamingChatNode (coming soon)
 */

// Re-export for convenience
export type Message = LLMMessage;

export type ChatStorage = {
    messages: Message[];
    // Future: context, metadata, user_data, etc.
}

export interface SimpleChatNodeConfig {
    llmProvider: LLMProvider;
    userMessage: string;
    llmConfig?: LLMConfig;
}

export class SimpleChatNode extends Node<ChatStorage> {
    private config: SimpleChatNodeConfig;

    constructor(config: SimpleChatNodeConfig) {
        super();
        
        if (!config.llmProvider) {
            throw new Error('LLM provider is required. Pass an LLMProvider instance in config.');
        }

        this.config = {
            llmConfig: {},
            ...config
        };
    }

    /**
     * PREP: Add user message to conversation history
     */
    async prep(shared: ChatStorage): Promise<Message[]> {
        // Add user message to shared storage
        shared.messages.push({ 
            role: 'user', 
            content: this.config.userMessage 
        });
        
        // Return messages for the LLM call
        return shared.messages;
    }
    
    /**
     * EXEC: Call LLM provider with conversation history
     */
    async exec(messages: Message[]): Promise<string> {
        try {
            const response = await this.config.llmProvider.complete(messages, this.config.llmConfig);
            return response.content;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`LLM provider error: ${error.message}`);
            }
            throw new Error('Unknown LLM provider error');
        }
    }
    
    /**
     * POST: Store AI response in conversation history
     */
    async post(shared: ChatStorage, prepRes: unknown, execRes: unknown): Promise<string | undefined> {
        // Add AI response to shared storage
        shared.messages.push({ 
            role: 'assistant', 
            content: execRes as string 
        });
        
        return undefined; // End the flow
    }

    /**
     * Get the last AI response from shared storage
     */
    static getLastResponse(shared: ChatStorage): string | null {
        const lastMessage = shared.messages[shared.messages.length - 1];
        return lastMessage?.role === 'assistant' ? lastMessage.content : null;
    }

    /**
     * Clear conversation history
     */
    static clearHistory(shared: ChatStorage): void {
        shared.messages = [];
    }

    /**
     * Add a system message to the conversation
     */
    static addSystemMessage(shared: ChatStorage, content: string): void {
        shared.messages.unshift({ role: 'system', content });
    }
}
