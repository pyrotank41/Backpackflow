import { Node } from '../../pocketflow';
import { LLMProvider } from '../../types/llm';
import { ChatCapable, BaseStorage } from '../../storage/capabilities';

/**
 * Storage requirements for ChatNode
 * This defines what capabilities the shared storage must have
 */
export type ChatNodeStorage = BaseStorage & ChatCapable;

/**
 * Configuration for ChatNode
 */
export interface ChatNodeConfig {
    llmProvider: LLMProvider;
    systemMessage?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
}

/**
 * A reusable chat node that can participate in any flow
 * requiring chat capabilities
 */
export class ChatNode extends Node<ChatNodeStorage> {
    private llmProvider: LLMProvider;
    private systemMessage?: string;
    private model: string;
    private temperature: number;
    private maxTokens?: number;

    constructor(config: ChatNodeConfig) {
        super(); // Node constructor has default parameters
        this.llmProvider = config.llmProvider;
        this.systemMessage = config.systemMessage;
        this.model = config.model || 'gpt-3.5-turbo';
        this.temperature = config.temperature ?? 0.7;
        this.maxTokens = config.maxTokens;
    }

    async prep(shared: ChatNodeStorage, userMessage?: string): Promise<any> {
        // Initialize chat if not exists
        if (!shared.chat) {
            shared.chat = {
                messages: [],
                config: {
                    model: this.model,
                    temperature: this.temperature,
                    maxTokens: this.maxTokens
                }
            };
        } else {
            // Update config to match current node settings
            shared.chat.config = {
                model: this.model,
                temperature: this.temperature,
                maxTokens: this.maxTokens
            };
        }

        // Add user message if provided
        if (userMessage) {
            shared.chat.messages.push({
                role: 'user',
                content: userMessage,
                timestamp: new Date()
            });
        }

        // Add system message if provided and not already present - it should be FIRST
        if (this.systemMessage && 
            !shared.chat.messages.some(m => m.role === 'system')) {
            shared.chat.messages.unshift({
                role: 'system',
                content: this.systemMessage,
                timestamp: new Date()
            });
        }

        // Check if there are user messages without assistant responses
        // Look for user messages that don't have a subsequent assistant response
        const messages = shared.chat.messages;
        let hasUnrespondedUserMessage = false;
        
        for (let i = 0; i < messages.length; i++) {
            if (messages[i].role === 'user') {
                // Check if there's an assistant response after this user message
                const hasResponse = messages.slice(i + 1).some(msg => msg.role === 'assistant');
                if (!hasResponse) {
                    hasUnrespondedUserMessage = true;
                    break;
                }
            }
        }
        
        // Only proceed to exec if there's a user message that needs a response
        if (hasUnrespondedUserMessage && messages.length > 0) {
            return messages;
        }
        return null;
    }

    async exec(messages: any[] | null): Promise<any> {
        // Skip execution if no messages to process
        if (!messages || messages.length === 0) {
            return null;
        }
        
        // Pure execution - call LLM with messages
        const response = await this.llmProvider.complete(messages);
        return response;
    }

    async post(shared: ChatNodeStorage, prepRes: any, execRes: any): Promise<string | undefined> {
        // Store AI response in shared storage
        if (shared.chat && execRes?.content) {
            shared.chat.messages.push({
                role: 'assistant',
                content: execRes.content,
                timestamp: new Date()
            });
            
            return execRes.content;
        }
        
        return undefined;
    }

    /**
     * Convenience method for single message completion
     */
    async sendMessage(shared: ChatNodeStorage, message: string): Promise<string> {
        const prepResult = await this.prep(shared, message);
        const execResult = await this.exec(prepResult);
        const postResult = await this.post(shared, prepResult, execResult);
        return postResult || '';
    }

    /**
     * Get the current conversation from storage
     */
    getConversation(shared: ChatNodeStorage) {
        return shared.chat?.messages || [];
    }

    /**
     * Clear the conversation history
     */
    clearConversation(shared: ChatNodeStorage) {
        if (shared.chat) {
            shared.chat.messages = [];
        }
    }
}
