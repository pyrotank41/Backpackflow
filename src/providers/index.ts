/**
 * LLM Providers for BackpackFlow
 * 
 * This module provides abstractions for different LLM providers,
 * making BackpackFlow agnostic to the underlying AI service.
 */

export { LLMProvider, LLMMessage, LLMResponse, LLMConfig } from '../types/llm';
export { OpenAIProvider, OpenAIConfig } from './openai-provider';

// Future providers:
// export { AnthropicProvider } from './anthropic-provider';
// export { CohereProvider } from './cohere-provider';
// export { LocalLLMProvider } from './local-llm-provider';

import { LLMProvider, LLMConfig } from '../types/llm';
import { OpenAIProvider, OpenAIConfig } from './openai-provider';

/**
 * Factory for creating LLM providers
 */
export class LLMProviderFactory {
    /**
     * Create an OpenAI provider
     */
    static createOpenAI(apiKey: string, config?: Partial<OpenAIConfig>): OpenAIProvider {
        return OpenAIProvider.create(apiKey, config);
    }

    /**
     * Create a provider from environment variables
     * Automatically detects provider type based on available API keys
     */
    static createFromEnv(): LLMProvider {
        const openaiKey = process.env.OPENAI_API_KEY;
        
        if (openaiKey) {
            return this.createOpenAI(openaiKey);
        }
        
        // Future: Check for other provider keys
        // const anthropicKey = process.env.ANTHROPIC_API_KEY;
        // const cohereKey = process.env.COHERE_API_KEY;
        
        throw new Error(
            'No LLM provider API key found. Please set one of: OPENAI_API_KEY'
            // Future: ', ANTHROPIC_API_KEY, COHERE_API_KEY'
        );
    }

    /**
     * Get available provider names
     */
    static getAvailableProviders(): string[] {
        return ['openai']; // Future: 'anthropic', 'cohere', 'local'
    }
}
