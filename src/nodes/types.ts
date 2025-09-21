import { BaseStorage } from '../storage/capabilities';
import { MCPTool, ToolRequest } from './mcp-core';
import { randomUUID } from 'crypto';

// ===== SHARED TYPES =====

export interface ToolRequestWithId {
    id: string;
    toolName: string;
    brief: string;
    status: 'pending' | 'param_generated' | 'executing' | 'completed' | 'failed';
}

export interface ToolParamWithId {
    toolRequestId: string;
    parameters: any;
    serverId: string;
}

export interface ToolExecutionResultWithId {
    toolRequestId: string;
    executionResult: any;
}

// OpenAI conversation message types
export interface ChatMessage {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
    tool_calls?: Array<{
        id: string;
        type: "function";
        function: {
            name: string;
            arguments: string;
        };
    }>;
    tool_call_id?: string;
}

// ===== STORAGE CAPABILITIES =====

export interface MCPCapable {
    available_tools?: MCPTool[];
    tool_manager?: any; // MCPServerManager instance
}

export interface DecisionCapable {
    currentDecision?: any;
    toolRequests?: ToolRequestWithId[];
    toolParameters?: ToolParamWithId[];
    toolExecutionResults?: ToolExecutionResultWithId[];
}

export interface ConversationCapable {
    messages?: ChatMessage[];
    finalAnswer?: string;
}

// Combined storage types for each node
export type DecisionNodeStorage = BaseStorage & MCPCapable & DecisionCapable & ConversationCapable;
export type ToolParamNodeStorage = BaseStorage & MCPCapable & DecisionCapable;
export type ToolExecutionNodeStorage = BaseStorage & MCPCapable & DecisionCapable;
export type FinalAnswerNodeStorage = BaseStorage & MCPCapable & DecisionCapable & ConversationCapable;

// ===== UTILITY FUNCTIONS =====

// Real UUID generator for tool requests
export function generateToolRequestId(): string {
    return `tc_${randomUUID()}`;
}

// Helper function to access related tool data via toolRequestId
export function getToolContext(toolRequestId: string, shared: DecisionCapable & MCPCapable) {
    const request = shared.toolRequests?.find((r: ToolRequestWithId) => r.id === toolRequestId);
    const params = shared.toolParameters?.find((p: ToolParamWithId) => p.toolRequestId === toolRequestId);
    const result = shared.toolExecutionResults?.find((r: ToolExecutionResultWithId) => r.toolRequestId === toolRequestId);
    const tool = shared.available_tools?.find((t: any) => t.name === request?.toolName);
    
    return { request, params, result, tool };
}

// Helper function to convert JSON Schema to Zod schema
export function jsonSchemaToZod(schema: any, definitions: any = {}): any {
    // Import zod dynamically to avoid circular dependencies
    const z = require('zod');
    
    if (schema.$ref) {
        const refKey = schema.$ref.replace('#/$defs/', '');
        return jsonSchemaToZod(definitions[refKey], definitions);
    }

    switch (schema.type) {
        case 'string':
            return z.string().describe(schema.description || schema.title || '');
        
        case 'number':
            return z.number().describe(schema.description || schema.title || '');
        
        case 'integer':
            return z.number().int().describe(schema.description || schema.title || '');
        
        case 'boolean':
            return z.boolean().describe(schema.description || schema.title || '');
        
        case 'array':
            const itemSchema = jsonSchemaToZod(schema.items, definitions);
            return z.array(itemSchema).describe(schema.description || schema.title || '');
        
        case 'object':
            const shape: any = {};
            if (schema.properties) {
                for (const [key, value] of Object.entries(schema.properties)) {
                    const fieldSchema = jsonSchemaToZod(value as any, definitions);
                    
                    // Handle optional fields (not in required array)
                    if (schema.required && schema.required.includes(key)) {
                        shape[key] = fieldSchema;
                    } else {
                        shape[key] = fieldSchema.optional();
                    }
                }
            }
            return z.object(shape).describe(schema.description || schema.title || '');
        
        default:
            // Handle anyOf (union types)
            if (schema.anyOf) {
                // Find the non-null option
                const nonNullOptions = schema.anyOf.filter((opt: any) => opt.type !== 'null');
                if (nonNullOptions.length === 1) {
                    const option = nonNullOptions[0];
                    let baseSchema;
                    
                    switch (option.type) {
                        case 'string':
                            baseSchema = z.string();
                            break;
                        case 'number':
                            baseSchema = z.number();
                            break;
                        case 'integer':
                            baseSchema = z.number().int();
                            break;
                        case 'boolean':
                            baseSchema = z.boolean();
                            break;
                        default:
                            baseSchema = z.string();
                    }
                    
                    // If there's a null option, make it optional
                    const hasNull = schema.anyOf.some((opt: any) => opt.type === 'null');
                    if (hasNull) {
                        baseSchema = baseSchema.optional();
                    }
                    
                    return baseSchema.describe(schema.description || schema.title || '');
                }
            }
            return z.string().describe(schema.description || schema.title || '');
    }
}
