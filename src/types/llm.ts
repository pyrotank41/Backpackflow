/**
 * LLM Abstraction Types for BackpackFlow
 * 
 * These interfaces allow BackpackFlow to work with any LLM provider,
 * not just OpenAI. This enables future support for Anthropic, Cohere,
 * local models, etc.
 */

export interface LLMMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface LLMResponse {
    content: string;
    usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
    };
    model?: string;
}

export interface LLMConfig {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: any; // Allow provider-specific config
}

/**
 * Base interface that all LLM providers must implement
 */
export interface LLMProvider {
    /**
     * Generate a completion from a list of messages
     */
    complete(messages: LLMMessage[], config?: LLMConfig): Promise<LLMResponse>;
    
    /**
     * Get the name of this provider (e.g., "openai", "anthropic")
     */
    getProviderName(): string;
    
    /**
     * Get supported models for this provider
     */
    getSupportedModels(): string[];
    
    /**
     * Validate configuration for this provider
     */
    validateConfig(config: LLMConfig): boolean;
}
