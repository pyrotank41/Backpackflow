import { Flow } from '../../pocketflow';
import { SimpleChatNode, SimpleChatNodeConfig, ChatStorage } from './simple-chat-node';
import { LLMProvider, LLMConfig, LLMProviderFactory } from '../../providers';

/**
 * Simple Chat Flow for BackpackFlow
 * 
 * A convenient wrapper around SimpleChatNode for basic chat workflows.
 * Provides utility methods for common chat operations.
 */

export class SimpleChatFlow extends Flow<ChatStorage> {
    constructor(config: SimpleChatNodeConfig) {
        const chatNode = new SimpleChatNode(config);
        super(chatNode);
    }

    /**
     * Send a message using the default provider (from environment)
     */
    static async sendMessage(
        shared: ChatStorage, 
        message: string, 
        llmConfig?: LLMConfig
    ): Promise<string> {
        const provider = LLMProviderFactory.createFromEnv();
        
        const flow = new SimpleChatFlow({
            llmProvider: provider,
            userMessage: message,
            llmConfig
        });
        
        await flow.run(shared);
        
        const response = SimpleChatNode.getLastResponse(shared);
        if (!response) {
            throw new Error('No response received from chat flow');
        }
        
        return response;
    }

    /**
     * Send a message using a specific provider
     */
    static async sendMessageWithProvider(
        shared: ChatStorage,
        message: string,
        provider: LLMProvider,
        llmConfig?: LLMConfig
    ): Promise<string> {
        const flow = new SimpleChatFlow({
            llmProvider: provider,
            userMessage: message,
            llmConfig
        });
        
        await flow.run(shared);
        
        const response = SimpleChatNode.getLastResponse(shared);
        if (!response) {
            throw new Error('No response received from chat flow');
        }
        
        return response;
    }

    /**
     * Start a new conversation with optional system prompt
     */
    static createConversation(systemPrompt?: string): ChatStorage {
        const shared: ChatStorage = { messages: [] };
        
        if (systemPrompt) {
            SimpleChatNode.addSystemMessage(shared, systemPrompt);
        }
        
        return shared;
    }
}
