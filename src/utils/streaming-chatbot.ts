/**
 * Streaming ChatBot using Backpackflow Terminal Interface
 * 
 * A reusable streaming chatbot class that combines the event system,
 * chat nodes, and terminal interface for easy deployment.
 */

import { TerminalChatInterface, TerminalChatStorage, TerminalChatOptions } from './terminal-chat';
import { createNamespacedStream, createEventChatNodeWithOpenAI } from '../index';

export interface StreamingChatBotConfig {
    apiKey: string;
    namespace?: string;
    systemMessage?: string;
    nodeId?: string;
    model?: string;
    temperature?: number;
    enableStreaming?: boolean;
    sessionId?: string;
    terminalOptions?: TerminalChatOptions;
}

export class StreamingChatBot {
    private chatNode: any;
    private storage: TerminalChatStorage;
    private eventStream: any;
    private terminalInterface: TerminalChatInterface;

    constructor(config: StreamingChatBotConfig) {
        // Validate API key
        if (!config.apiKey) {
            throw new Error('OpenAI API key is required');
        }

        // Create namespaced event stream
        this.eventStream = createNamespacedStream(config.namespace || 'streaming-chatbot', {
            enableDebugLogs: false,
            enableMetrics: true
        });

        // Create streaming chat node
        this.chatNode = createEventChatNodeWithOpenAI(config.apiKey, this.eventStream, {
            systemMessage: config.systemMessage || 'You are a helpful assistant. Keep responses concise and friendly.',
            nodeId: config.nodeId || 'streaming-chat-bot',
            enableStreaming: config.enableStreaming ?? true,
            model: config.model || 'gpt-4o-mini',
            temperature: config.temperature ?? 0.7
        });

        // Initialize storage
        this.storage = {
            sessionId: config.sessionId || `session-${Date.now()}`,
            messageCount: 0
        };

        // Create terminal interface
        this.terminalInterface = new TerminalChatInterface(
            this.chatNode,
            this.eventStream,
            this.storage,
            config.terminalOptions
        );
    }

    /**
     * Start the interactive chat session
     */
    public async start() {
        await this.terminalInterface.start();
    }

    /**
     * Add a custom command to the terminal interface
     */
    public addCommand(command: string, description: string, handler: () => void | Promise<void>) {
        this.terminalInterface.addCommand({
            command,
            description,
            handler
        });
    }

    /**
     * Send a message programmatically (useful for testing or automation)
     */
    public async sendMessage(message: string): Promise<string> {
        this.storage.messageCount++;
        return await this.chatNode.sendMessage(this.storage, message);
    }

    /**
     * Get current conversation history
     */
    public getConversation() {
        return this.chatNode.getConversation(this.storage);
    }

    /**
     * Clear conversation history
     */
    public clearConversation() {
        return this.chatNode.clearConversation(this.storage);
    }

    /**
     * Get current storage state
     */
    public getStorage(): TerminalChatStorage {
        return this.storage;
    }

    /**
     * Get event stream for custom event handling
     */
    public getEventStream() {
        return this.eventStream;
    }

    /**
     * Get the underlying chat node
     */
    public getChatNode() {
        return this.chatNode;
    }

    /**
     * Cleanup resources
     */
    public cleanup() {
        this.terminalInterface.cleanup();
    }
}

/**
 * Quick setup function for creating a streaming chatbot with minimal configuration
 */
export function createStreamingChatBot(
    apiKey: string, 
    options: Partial<StreamingChatBotConfig> = {}
): StreamingChatBot {
    return new StreamingChatBot({
        apiKey,
        ...options
    });
}

/**
 * Create a streaming chatbot with environment variable support
 */
export function createStreamingChatBotFromEnv(
    options: Partial<Omit<StreamingChatBotConfig, 'apiKey'>> = {}
): StreamingChatBot {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required');
    }

    return new StreamingChatBot({
        apiKey,
        ...options
    });
}
