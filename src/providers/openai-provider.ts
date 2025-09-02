import OpenAI from 'openai';
import { LLMProvider, LLMMessage, LLMResponse, LLMConfig } from '../types/llm';

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

export class OpenAIProvider implements LLMProvider {
    private client: OpenAI;
    private defaultConfig: OpenAIConfig;

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

            return {
                content: response,
                usage: {
                    prompt_tokens: completion.usage?.prompt_tokens,
                    completion_tokens: completion.usage?.completion_tokens,
                    total_tokens: completion.usage?.total_tokens,
                },
                model: completion.model,
            };
        } catch (error) {
            // if (error instanceof Error) {
            //     throw new Error(`OpenAI API error: ${error.message}`);
            // }
            throw new Error(`Unknown OpenAI API error: ${error}`);
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
     * Static factory method for easy instantiation
     */
    static create(apiKey: string, config?: Partial<OpenAIConfig>): OpenAIProvider {
        return new OpenAIProvider({
            apiKey,
            ...config
        });
    }
}
