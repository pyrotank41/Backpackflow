import { Node } from '../pocketflow';
import OpenAI from 'openai';
import Instructor from '@instructor-ai/instructor';
import { EventStreamer, StreamEventType } from '../events/event-streamer';

// ===== BASE LLM NODE CONFIGURATION =====

export interface LLMNodeConfig {
    // LLM Configuration (Required)
    instructorClient: any;   // Instructor client (required - must be passed in)
    model?: string;          // Default: "gpt-4o"
    temperature?: number;    // Default: 0.1
    
    // Prompt Configuration
    systemPrompt?: string;   // Override default system prompt
    
    // Additional node-specific config can be added by extending classes
    [key: string]: any;
}

// ===== EVENT STREAMING CONFIGURATION =====
// Separate interface for event streaming to keep concerns separated
export interface EventStreamingConfig {
    eventStreamer?: EventStreamer;  // If provided, node will emit events
    namespace?: string;             // Namespace for events (default: node class name)
}

// ===== INSTRUCTOR CLIENT FACTORIES =====

/**
 * Create an Instructor client with OpenAI
 */
export function createOpenAIInstructorClient(apiKey?: string) {
    const oai = new OpenAI({
        apiKey: apiKey || process.env.OPENAI_API_KEY || 'your-api-key'
    });

    return Instructor({
        client: oai,
        mode: "TOOLS"
    });
}

/**
 * Create an Instructor client with Azure OpenAI
 */
export function createAzureOpenAIInstructorClient(config: {
    apiKey?: string;
    endpoint?: string;
    deploymentName?: string;
    apiVersion?: string;
}) {
    const azureOpenAI = new OpenAI({
        apiKey: config.apiKey || process.env.AZURE_OPENAI_API_KEY,
        baseURL: `${config.endpoint || process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${config.deploymentName || process.env.AZURE_OPENAI_DEPLOYMENT_NAME}`,
        defaultQuery: { 'api-version': config.apiVersion || process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview' },
        defaultHeaders: {
            'api-key': config.apiKey || process.env.AZURE_OPENAI_API_KEY,
        },
    });

    return Instructor({
        client: azureOpenAI,
        mode: "TOOLS"
    });
}

export function createInstructorClient(config: {
    provider: 'openai' | 'azure',
    apiKey?: string,
    endpoint?: string,
    deploymentName?: string,
    apiVersion?: string
}): any {
    if (config.provider === 'openai') {
        return createOpenAIInstructorClient(config.apiKey);
    } else if (config.provider === 'azure') {
        return createAzureOpenAIInstructorClient({
            apiKey: config.apiKey,
            endpoint: config.endpoint,
            deploymentName: config.deploymentName,
            apiVersion: config.apiVersion
        });
    } else {
        throw new Error('Invalid provider');
    }
}

// ===== BASE LLM NODE CLASS =====

export abstract class BaseLLMNode extends Node {
    protected client: any;
    protected systemPrompt: string;
    protected model: string;
    protected temperature: number;
    
    // Event streaming properties
    protected eventStreamer?: EventStreamer;
    public namespace: string;
    
    constructor(config: LLMNodeConfig & EventStreamingConfig) {
        super();
        
        // Require instructor client to be passed in
        if (!config.instructorClient) {
            throw new Error(`${this.constructor.name} requires an instructorClient to be provided in config`);
        }
        
        this.client = config.instructorClient;
        this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
        this.model = config.model || 'gpt-4o';
        this.temperature = config.temperature ?? 0.1;
        
        // Initialize event streaming (separate concern)
        this.eventStreamer = config.eventStreamer;
        this.namespace = config.namespace || this.constructor.name.toLowerCase();
    }
    
    /**
     * Each node must define its default system prompt
     */
    protected abstract getDefaultSystemPrompt(): string;
    
    /**
     * Helper method to emit events safely (only if eventStreamer is available)
     */
    protected emitEvent(eventType: StreamEventType, content: any): void {
        if (this.eventStreamer) {
            this.eventStreamer.emitEvent(this.namespace, eventType, content, this.constructor.name);
        }
    }
    
    /**
     * Helper method to create LLM messages with system prompt
     */
    protected createMessages(userContent: string, additionalContext?: string): any[] {
        const messages = [
            {
                role: "system",
                content: this.systemPrompt
            },
            {
                role: "user", 
                content: additionalContext ? `${additionalContext}\n\n${userContent}` : userContent
            }
        ];
        
        return messages;
    }
    
    /**
     * Helper method for structured LLM calls with Instructor
     */
    protected async callLLMStructured(messages: any[], responseModel: any, modelName?: string): Promise<any> {
        return await this.client.chat.completions.create({
            messages,
            model: modelName || this.model,
            response_model: responseModel,
            temperature: this.temperature
        });
    }
    
    /**
     * Helper method for regular LLM calls (non-structured)
     */
    protected async callLLMRegular(messages: any[], modelName?: string): Promise<any> {
        // Use the underlying OpenAI client directly for non-structured calls
        const openaiClient = this.client.client || this.client;
        
        return await openaiClient.chat.completions.create({
            messages,
            model: modelName || this.model,
            temperature: this.temperature
        });
    }
    
}
