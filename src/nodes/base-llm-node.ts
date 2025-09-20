import { Node } from '../pocketflow';
import OpenAI from 'openai';
import Instructor from '@instructor-ai/instructor';

// ===== BASE LLM NODE CONFIGURATION =====

export interface LLMNodeConfig {
    // LLM Configuration
    instructorClient?: any;  // Pre-configured Instructor client
    model?: string;          // Default: "gpt-4o"
    temperature?: number;    // Default: 0.1
    
    // Prompt Configuration
    systemPrompt?: string;   // Override default system prompt
    
    // Additional node-specific config can be added by extending classes
    [key: string]: any;
}

// ===== DEFAULT INSTRUCTOR CLIENT FACTORY =====

export function getDefaultInstructorClient() {
    const oai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'your-api-key'
    });

    return Instructor({
        client: oai,
        mode: "FUNCTIONS"
    });
}

// ===== BASE LLM NODE CLASS =====

export abstract class BaseLLMNode extends Node {
    protected client: any;
    protected systemPrompt: string;
    protected model: string;
    protected temperature: number;
    
    constructor(config: LLMNodeConfig = {}) {
        super();
        this.client = config.instructorClient || getDefaultInstructorClient();
        this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
        this.model = config.model || 'gpt-4o';
        this.temperature = config.temperature ?? 0.1;
    }
    
    /**
     * Each node must define its default system prompt
     */
    protected abstract getDefaultSystemPrompt(): string;
    
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
