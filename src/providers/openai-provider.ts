import OpenAI from 'openai';
import { LLMProvider, LLMMessage, LLMResponse, LLMConfig } from '../types/llm';
import { EventStream } from '../events/event-stream';

/**
 * OpenAI Provider for BackpackFlow
 * 
 * Implements the LLM abstraction for OpenAI's API.
 * Supports GPT-3.5, GPT-4, and other OpenAI models.
 */

export interface OpenAIConfig extends LLMConfig {
    apiKey: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
}

// Streaming options for real-time response handling
export interface StreamingOptions {
    onChunk?: (chunk: string) => void | Promise<void>;
    onComplete?: (fullText: string) => void | Promise<void>;
    onError?: (error: Error) => void | Promise<void>;
    shouldStop?: () => boolean;
    nodeId?: string;
}

// Enhanced LLM response with streaming metadata
export interface StreamingLLMResponse extends LLMResponse {
    duration?: number;
    chunkCount?: number;
    streamingEnabled?: boolean;
}

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;
    private defaultConfig: OpenAIConfig;
    private eventStream?: EventStream;

    constructor(config: OpenAIConfig) {
        if (!config.apiKey) {
            throw new Error('OpenAI API key is required');
        }

        this.client = new OpenAI({
            apiKey: config.apiKey,
        });

        this.defaultConfig = {
            model: 'gpt-4o',
            temperature: 0.7,
            maxTokens: 2048,
            ...config
        };
    }

    async complete(messages: LLMMessage[], config?: LLMConfig): Promise<LLMResponse> {
        const mergedConfig = { ...this.defaultConfig, ...config } as OpenAIConfig;
        const nodeId = (config as any)?.nodeId || 'unknown-node';
        const startTime = Date.now();

        // Emit LLM request event
        this.eventStream?.emit('llm:request', {
            provider: 'openai',
            model: mergedConfig.model!,
            messages,
            config: mergedConfig,
            nodeId,
            timestamp: startTime
        });

        try {
            const requestParams: any = {
                model: mergedConfig.model!,
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
            };

            // Handle model-specific parameters
            const isNewModel = mergedConfig.model?.includes('gpt-5') || mergedConfig.model?.includes('o1');
            
            if (isNewModel) {
                // Newer models use max_completion_tokens and don't support custom temperature
                requestParams.max_completion_tokens = mergedConfig.maxTokens;
                // Don't set temperature for gpt-5/o1 models (they only support default value of 1)
            } else {
                // Older models support all parameters
                requestParams.max_tokens = mergedConfig.maxTokens;
                requestParams.temperature = mergedConfig.temperature;
                requestParams.top_p = mergedConfig.topP;
                requestParams.frequency_penalty = mergedConfig.frequencyPenalty;
                requestParams.presence_penalty = mergedConfig.presencePenalty;
            }

            const completion = await this.client.chat.completions.create(requestParams);

            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('No response received from OpenAI');
            }

            const duration = Date.now() - startTime;
            const result = {
                content: response,
                usage: {
                    prompt_tokens: completion.usage?.prompt_tokens,
                    completion_tokens: completion.usage?.completion_tokens,
                    total_tokens: completion.usage?.total_tokens,
                },
                model: completion.model,
            };

            // Emit LLM response event
            this.eventStream?.emit('llm:response', {
                provider: 'openai',
                model: mergedConfig.model!,
                response: result,
                usage: result.usage,
                duration,
                nodeId,
                timestamp: Date.now()
            });

            return result;
        } catch (error) {
            // Emit LLM error event
            this.eventStream?.emit('llm:error', {
                provider: 'openai',
                model: mergedConfig.model!,
                error: (error as Error).message,
                nodeId,
                timestamp: Date.now()
            });

            throw new Error(`OpenAI API error: ${(error as Error).message}`);
        }
    }

    getProviderName(): string {
        return 'openai';
    }

    getSupportedModels(): string[] {
        return [
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-4-turbo',
            'gpt-4',
            'gpt-3.5-turbo',
            'gpt-3.5-turbo-16k',
        ];
    }

    validateConfig(config: LLMConfig): boolean {
        const openaiConfig = config as OpenAIConfig;
        
        // Check required fields
        if (!openaiConfig.apiKey) {
            return false;
        }

        // Check model is supported
        if (openaiConfig.model && !this.getSupportedModels().includes(openaiConfig.model)) {
            return false;
        }

        // Check parameter ranges
        if (openaiConfig.temperature !== undefined && (openaiConfig.temperature < 0 || openaiConfig.temperature > 2)) {
            return false;
        }

        if (openaiConfig.topP !== undefined && (openaiConfig.topP < 0 || openaiConfig.topP > 1)) {
            return false;
        }

        return true;
    }

    /**
     * Stream LLM response with real-time chunk delivery and events
     */
    async streamComplete(
        messages: LLMMessage[], 
        options: StreamingOptions = {},
        config?: LLMConfig
    ): Promise<StreamingLLMResponse> {
        const mergedConfig = { ...this.defaultConfig, ...config } as OpenAIConfig;
        const nodeId = options.nodeId || (config as any)?.nodeId || 'unknown-node';
        const startTime = Date.now();
        
        let fullResponse = '';
        let chunkCount = 0;
        let totalLength = 0;

        // Emit content start event
        this.eventStream?.emit('content:start', {
            nodeId,
            model: mergedConfig.model,
            timestamp: startTime
        });

        // Emit LLM request event
        this.eventStream?.emit('llm:request', {
            provider: 'openai',
            model: mergedConfig.model!,
            messages,
            config: mergedConfig,
            nodeId,
            timestamp: startTime
        });

        try {
            const requestParams: any = {
                model: mergedConfig.model!,
                messages: messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                })),
                stream: true
            };

            // Handle model-specific parameters
            const isNewModel = mergedConfig.model?.includes('gpt-5') || mergedConfig.model?.includes('o1');
            
            if (isNewModel) {
                requestParams.max_completion_tokens = mergedConfig.maxTokens;
            } else {
                requestParams.max_tokens = mergedConfig.maxTokens;
                requestParams.temperature = mergedConfig.temperature;
                requestParams.top_p = mergedConfig.topP;
                requestParams.frequency_penalty = mergedConfig.frequencyPenalty;
                requestParams.presence_penalty = mergedConfig.presencePenalty;
            }

            const stream = await this.client.chat.completions.create(requestParams) as any;

            for await (const chunk of stream) {
                // Check if we should stop streaming
                if (options.shouldStop && options.shouldStop()) {
                    break;
                }

                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    fullResponse += content;
                    totalLength += content.length;
                    chunkCount++;
                    
                    // Emit streaming event for each chunk
                    this.eventStream?.emit('content:stream', {
                        chunk: content,
                        totalLength,
                        nodeId,
                        timestamp: Date.now()
                    });

                    // Call user-provided chunk handler
                    if (options.onChunk) {
                        await options.onChunk(content);
                    }
                }
            }

            const duration = Date.now() - startTime;
            const result: StreamingLLMResponse = {
                content: fullResponse,
                usage: {
                    completion_tokens: totalLength,
                    total_tokens: totalLength
                },
                model: mergedConfig.model!,
                duration,
                chunkCount,
                streamingEnabled: true
            };

            // Emit content complete event
            this.eventStream?.emit('content:complete', {
                content: fullResponse,
                totalLength,
                duration,
                nodeId,
                timestamp: Date.now()
            });

            // Emit LLM response event
            this.eventStream?.emit('llm:response', {
                provider: 'openai',
                model: mergedConfig.model!,
                response: result,
                usage: result.usage,
                duration,
                nodeId,
                timestamp: Date.now()
            });

            // Call user-provided completion handler
            if (options.onComplete) {
                await options.onComplete(fullResponse);
            }

            return result;

        } catch (error) {
            const err = error as Error;
            
            // Emit LLM error event
            this.eventStream?.emit('llm:error', {
                provider: 'openai',
                model: mergedConfig.model!,
                error: err.message,
                nodeId,
                timestamp: Date.now()
            });

            // Call user-provided error handler
            if (options.onError) {
                await options.onError(err);
            }

            throw new Error(`OpenAI streaming error: ${err.message}`);
        }
    }

    /**
     * Set the event stream for this provider
     */
    setEventStream(eventStream: EventStream): void {
        this.eventStream = eventStream;
    }

    /**
     * Get the current event stream
     */
    getEventStream(): EventStream | undefined {
        return this.eventStream;
    }

    /**
     * Static factory method for easy instantiation
     */
    static create(apiKey: string, config?: Partial<OpenAIConfig>): OpenAIProvider {
        return new OpenAIProvider({
            apiKey,
            ...config
        });
    }
}
