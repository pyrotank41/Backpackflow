import { ChatNode, ChatNodeConfig, ChatNodeStorage } from './chat-node';
import { EventStream } from '../../events/event-stream';
import { OpenAIProvider, StreamingOptions } from '../../providers/openai-provider';

/**
 * Enhanced configuration for EventChatNode with event streaming support
 */
export interface EventChatNodeConfig extends ChatNodeConfig {
    nodeId?: string;
    eventStream?: EventStream;
    enableStreaming?: boolean;
    streamingOptions?: Partial<StreamingOptions>;
}

/**
 * EventChatNode - Enhanced ChatNode with comprehensive event streaming
 * 
 * Extends the base ChatNode to provide:
 * - Real-time content streaming events
 * - Node lifecycle events (prep/exec/post phases)
 * - Storage operation events
 * - Error handling events
 * - LLM provider events
 * 
 * Events emitted follow the pattern: {namespace}:{category}:{action}
 * - node:start / node:stop - Lifecycle events for each phase
 * - content:stream / content:complete - Real-time streaming
 * - storage:read / storage:write - Storage operations
 * - llm:request / llm:response / llm:error - Provider events
 * - error:node - Node-level errors
 */
export class EventChatNode extends ChatNode {
    private nodeId: string;
    private eventStream?: EventStream;
    private enableStreaming: boolean;
    private streamingOptions: Partial<StreamingOptions>;

    constructor(config: EventChatNodeConfig) {
        super(config);
        this.nodeId = config.nodeId || `event-chat-node-${Date.now()}`;
        this.eventStream = config.eventStream;
        this.enableStreaming = config.enableStreaming ?? true;
        this.streamingOptions = config.streamingOptions || {};

        // Set event stream on the LLM provider if it supports it
        if (this.eventStream && this.llmProvider && 'setEventStream' in this.llmProvider) {
            (this.llmProvider as any).setEventStream(this.eventStream);
        }

        // Emit node creation event
        this.eventStream?.emit('node:created', {
            nodeType: 'EventChatNode',
            nodeId: this.nodeId,
            config: {
                model: this.model,
                temperature: this.temperature,
                maxTokens: this.maxTokens,
                enableStreaming: this.enableStreaming
            },
            timestamp: Date.now()
        });
    }

    async prep(shared: ChatNodeStorage, userMessage?: string): Promise<any> {
        const startTime = Date.now();
        
        // Emit node start event
        this.eventStream?.emit('node:start', {
            nodeType: 'EventChatNode',
            nodeId: this.nodeId,
            phase: 'prep',
            timestamp: startTime
        });

        try {
            // Call parent prep method
            const result = await super.prep(shared, userMessage);

            // Emit storage events for the operations that happened
            if (!shared.chat) {
                // Chat was initialized
                this.eventStream?.emit('storage:write', {
                    key: 'chat',
                    value: shared.chat,
                    nodeId: this.nodeId,
                    timestamp: Date.now()
                });
            } else {
                // Chat was read
                this.eventStream?.emit('storage:read', {
                    key: 'chat',
                    value: shared.chat,
                    nodeId: this.nodeId,
                    timestamp: Date.now()
                });
            }

            // Emit user input event if message was provided
            if (userMessage) {
                this.eventStream?.emit('user:input', {
                    message: userMessage,
                    timestamp: Date.now()
                });

                this.eventStream?.emit('storage:write', {
                    key: 'chat.messages',
                    value: { role: 'user', content: userMessage },
                    nodeId: this.nodeId,
                    timestamp: Date.now()
                });
            }

            // Emit system message event if it was added
            if (this.systemMessage && shared.chat && 
                shared.chat.messages.some(m => m.role === 'system')) {
                this.eventStream?.emit('storage:write', {
                    key: 'chat.messages',
                    value: { role: 'system', content: this.systemMessage },
                    nodeId: this.nodeId,
                    timestamp: Date.now()
                });
            }

            const duration = Date.now() - startTime;
            
            // Emit node stop event
            this.eventStream?.emit('node:stop', {
                nodeType: 'EventChatNode',
                nodeId: this.nodeId,
                phase: 'prep',
                result: result ? 'has_messages' : 'no_messages',
                duration,
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            // Emit error event
            this.eventStream?.emit('error:node', {
                nodeId: this.nodeId,
                error: (error as Error).message,
                phase: 'prep',
                stack: (error as Error).stack,
                timestamp: Date.now()
            });
            throw error;
        }
    }

    async exec(messages: any[] | null): Promise<any> {
        if (!messages || messages.length === 0) {
            return null;
        }

        const startTime = Date.now();
        
        // Emit node start event
        this.eventStream?.emit('node:start', {
            nodeType: 'EventChatNode',
            nodeId: this.nodeId,
            phase: 'exec',
            timestamp: startTime
        });

        try {
            let result;

            // Use streaming if enabled and provider supports it
            if (this.enableStreaming && this.llmProvider && 'streamComplete' in this.llmProvider) {
                const openaiProvider = this.llmProvider as OpenAIProvider;
                
                const streamingOptions: StreamingOptions = {
                    nodeId: this.nodeId,
                    onChunk: (chunk: string) => {
                        // Chunk event is already emitted by the provider
                        if (this.streamingOptions.onChunk) {
                            this.streamingOptions.onChunk(chunk);
                        }
                    },
                    onComplete: (fullText: string) => {
                        // Complete event is already emitted by the provider
                        if (this.streamingOptions.onComplete) {
                            this.streamingOptions.onComplete(fullText);
                        }
                    },
                    onError: (error: Error) => {
                        // Error event is already emitted by the provider
                        if (this.streamingOptions.onError) {
                            this.streamingOptions.onError(error);
                        }
                    },
                    shouldStop: this.streamingOptions.shouldStop
                };

                result = await openaiProvider.streamComplete(
                    messages, 
                    streamingOptions,
                    { 
                        model: this.model,
                        temperature: this.temperature,
                        maxTokens: this.maxTokens,
                        nodeId: this.nodeId
                    }
                );
            } else {
                // Fall back to regular completion
                result = await this.llmProvider.complete(messages, {
                    model: this.model,
                    temperature: this.temperature,
                    maxTokens: this.maxTokens,
                    nodeId: this.nodeId
                });
            }

            const duration = Date.now() - startTime;
            
            // Emit node stop event
            this.eventStream?.emit('node:stop', {
                nodeType: 'EventChatNode',
                nodeId: this.nodeId,
                phase: 'exec',
                result: result?.content ? 'success' : 'no_content',
                duration,
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            // Emit error event
            this.eventStream?.emit('error:node', {
                nodeId: this.nodeId,
                error: (error as Error).message,
                phase: 'exec',
                stack: (error as Error).stack,
                timestamp: Date.now()
            });
            throw error;
        }
    }

    async post(shared: ChatNodeStorage, prepRes: any, execRes: any): Promise<string | undefined> {
        const startTime = Date.now();
        
        // Emit node start event
        this.eventStream?.emit('node:start', {
            nodeType: 'EventChatNode',
            nodeId: this.nodeId,
            phase: 'post',
            timestamp: startTime
        });

        try {
            // Call parent post method
            const result = await super.post(shared, prepRes, execRes);

            // Emit storage write event for assistant message
            if (shared.chat && execRes?.content) {
                this.eventStream?.emit('storage:write', {
                    key: 'chat.messages',
                    value: { role: 'assistant', content: execRes.content },
                    nodeId: this.nodeId,
                    timestamp: Date.now()
                });
            }

            const duration = Date.now() - startTime;
            
            // Emit node stop event
            this.eventStream?.emit('node:stop', {
                nodeType: 'EventChatNode',
                nodeId: this.nodeId,
                phase: 'post',
                result: result || 'no_content',
                duration,
                timestamp: Date.now()
            });

            return result;

        } catch (error) {
            // Emit error event
            this.eventStream?.emit('error:node', {
                nodeId: this.nodeId,
                error: (error as Error).message,
                phase: 'post',
                stack: (error as Error).stack,
                timestamp: Date.now()
            });
            throw error;
        }
    }

    /**
     * Enhanced sendMessage with events
     */
    async sendMessage(shared: ChatNodeStorage, message: string): Promise<string> {
        // This method will automatically emit all the relevant events
        // through the prep/exec/post lifecycle
        return super.sendMessage(shared, message);
    }

    /**
     * Get conversation with storage read event
     */
    getConversation(shared: ChatNodeStorage) {
        this.eventStream?.emit('storage:read', {
            key: 'chat.messages',
            value: shared.chat?.messages || [],
            nodeId: this.nodeId,
            timestamp: Date.now()
        });
        
        return super.getConversation(shared);
    }

    /**
     * Clear conversation with storage write event
     */
    clearConversation(shared: ChatNodeStorage) {
        super.clearConversation(shared);
        
        this.eventStream?.emit('storage:write', {
            key: 'chat.messages',
            value: [],
            nodeId: this.nodeId,
            timestamp: Date.now()
        });
    }

    /**
     * Set the event stream for this node
     */
    setEventStream(eventStream: EventStream): void {
        this.eventStream = eventStream;
        
        // Also set it on the LLM provider if it supports events
        if (this.llmProvider && 'setEventStream' in this.llmProvider) {
            (this.llmProvider as any).setEventStream(eventStream);
        }
    }

    /**
     * Get the current event stream
     */
    getEventStream(): EventStream | undefined {
        return this.eventStream;
    }

    /**
     * Get the node ID
     */
    getNodeId(): string {
        return this.nodeId;
    }

    /**
     * Enable or disable streaming
     */
    setStreamingEnabled(enabled: boolean): void {
        this.enableStreaming = enabled;
    }

    /**
     * Update streaming options
     */
    setStreamingOptions(options: Partial<StreamingOptions>): void {
        this.streamingOptions = { ...this.streamingOptions, ...options };
    }

    /**
     * Check if streaming is enabled
     */
    isStreamingEnabled(): boolean {
        return this.enableStreaming;
    }

    /**
     * Get streaming statistics (if available)
     */
    getStreamingStats(): any {
        if (this.eventStream) {
            return this.eventStream.getStats();
        }
        return null;
    }

    /**
     * Create a child node with the same configuration but new nodeId
     */
    createChild(childId?: string): EventChatNode {
        const newNodeId = childId || `${this.nodeId}-child-${Date.now()}`;
        
        return new EventChatNode({
            llmProvider: this.llmProvider,
            systemMessage: this.systemMessage,
            model: this.model,
            temperature: this.temperature,
            maxTokens: this.maxTokens,
            nodeId: newNodeId,
            eventStream: this.eventStream,
            enableStreaming: this.enableStreaming,
            streamingOptions: { ...this.streamingOptions }
        });
    }
}

/**
 * Factory function to create EventChatNode with common configurations
 */
export function createEventChatNode(config: EventChatNodeConfig): EventChatNode {
    return new EventChatNode(config);
}

/**
 * Factory function to create EventChatNode with OpenAI provider and event stream
 */
export function createEventChatNodeWithOpenAI(
    apiKey: string,
    eventStream: EventStream,
    config?: Partial<EventChatNodeConfig>
): EventChatNode {
    const openaiProvider = new OpenAIProvider({ apiKey });
    
    return new EventChatNode({
        llmProvider: openaiProvider,
        eventStream,
        enableStreaming: true,
        ...config
    });
}
