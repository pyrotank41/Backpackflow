import { ParallelBatchNode } from '../pocketflow';
import { LLMNodeConfig, EventStreamingConfig } from './base-llm-node';
import { EventStreamer, StreamEventType } from '../events/event-streamer';
import { z } from 'zod';
import { 
    ToolParamNodeStorage, 
    ToolRequestWithId, 
    ToolParamWithId,
    jsonSchemaToZod, 
    getToolContext
} from './types';

// ===== TOOL PARAM GENERATION NODE CONFIGURATION =====

export interface ToolParamNodeConfig extends LLMNodeConfig, EventStreamingConfig {
    // Additional config options can be added here
}

// ===== TOOL PARAM GENERATION NODE =====

export class ToolParamGenerationNode extends ParallelBatchNode {
    private client: any;
    private systemPrompt: string;
    private model: string;
    private temperature: number;
    
    // Event streaming properties
    protected eventStreamer?: EventStreamer;
    protected namespace: string;

    constructor(config: ToolParamNodeConfig) {
        super();
        // Require instructor client to be passed in
        if (!config.instructorClient) {
            throw new Error('ToolParamGenerationNode requires an instructorClient to be provided in config');
        }
        this.client = config.instructorClient;
        this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
        this.model = config.model || 'gpt-4o';
        this.temperature = config.temperature ?? 0.1;
        
        // Initialize event streaming
        this.eventStreamer = config.eventStreamer;
        this.namespace = config.namespace || this.constructor.name.toLowerCase();
    }
    
    protected getDefaultSystemPrompt(): string {
        return `You are a tool parameter generation agent. You will be given a tool name and a brief descriptionof why the tool is being called. You will need to generate the parameters for the tool.`;
    }
    
    /**
     * Helper method to emit events safely (only if eventStreamer is available)
     */
    protected emitEvent(eventType: StreamEventType, content: any): void {
        if (this.eventStreamer) {
            this.eventStreamer.emitEvent(this.namespace, eventType, content, this.constructor.name);
        }
    }

    // this node will generate the parameters for the tool call using the tool name
    async prep(shared: ToolParamNodeStorage): Promise<unknown[]> {
        
        if (shared.currentDecision?.action === "tool_call_request") {
            const toolRequests: ToolRequestWithId[] = shared.toolRequests || [];
            
            // Create an array of prep objects for each tool request
            return toolRequests.map((toolRequest: ToolRequestWithId) => {
                const Tool = shared.available_tools?.find((t: any) => t.name === toolRequest.toolName);
                
                if (!Tool) {
                    throw new Error(`Tool ${toolRequest.toolName} not found`);
                }

                let toolParamSchema = Tool.inputSchema;
                

                const user_prompt = `
You are a tool parameter generation agent. You will be given a tool name and a brief description of the tool. You will need to generate the parameters for the tool.

Tool name: ${toolRequest.toolName}
Tool description: ${Tool.description}
Tool parameter brief (what we want from the tool): ${toolRequest.brief}

Required parameters: ${JSON.stringify(Tool.inputSchema, null, 2)}

response format: json
`;

                // const param_generation_messages = [
                //     { role: 'system', content: this.systemPrompt },
                //     { role: 'user', content: user_prompt }
                // ]

                // use the shared.messages array, add the user_prompt to the end of the array, replace the system prompt with this.systemPrompt
                const param_generation_messages = [...(shared.messages || []), { role: 'user', content: user_prompt }];
                if (param_generation_messages[0].role === "system") {
                    param_generation_messages[0].content = this.systemPrompt;
                }
                else {
                    param_generation_messages.unshift({ role: "system", content: this.systemPrompt });
                }

                return {
                    param_generation_messages: param_generation_messages, 
                    toolParamSchema: toolParamSchema, 
                    tool_in_use: Tool,
                    toolRequest: toolRequest
                };
            });
        }
        else {
            console.warn('Tool param generation node called but no tool call request found');
            return [];
        }
    }
    
    async exec(prepRes: any): Promise<unknown> {
        const param_generation_messages = prepRes.param_generation_messages;
        const toolParamSchema = prepRes.toolParamSchema;
        const toolRequest = prepRes.toolRequest;

        // Emit progress event
        this.emitEvent(StreamEventType.PROGRESS, { 
            status: 'generating_parameters',
            tool: toolRequest.toolName,
            tool_id: toolRequest.id
        });

        const param_generation_response = await this.client.chat.completions.create({
            messages: param_generation_messages,
            model: this.model,
            // response_model: toolParamSchema, // Use Zod schema directly
            temperature: this.temperature
        });
        console.log("Param generation response: " + JSON.stringify(param_generation_response.choices[0].message.content, null, 2));
        const param_generation_response_content = JSON.parse(param_generation_response.choices[0].message.content);
        console.log("Param generation response content: " + JSON.stringify(param_generation_response_content, null, 2));

        // Parameter generation details are now emitted via events instead of console.log
        
        const result = {
            toolRequestId: toolRequest.id,
            parameters: param_generation_response_content,
            serverId: prepRes.tool_in_use.serverId
        };
        
        // Emit completion event with parameter details
        this.emitEvent(StreamEventType.METADATA, {
            parameters_generated: true,
            tool: toolRequest.toolName,
            tool_id: toolRequest.id,
            parameter_count: Object.keys(param_generation_response_content).length,
            generated_parameters: param_generation_response_content
        });
        
        return result;
    }
    
    async post(shared: ToolParamNodeStorage, prepRes: any[], execRes: any[]): Promise<string> {
        // Store parameters in the new tracking structure
        shared.toolParameters = execRes.map((result: any) => ({
            toolRequestId: result.toolRequestId,
            parameters: result.parameters,
            serverId: result.serverId
        } as ToolParamWithId));
        
        // Update tool request statuses
        shared.toolRequests?.forEach((req: ToolRequestWithId) => {
            const hasParams = shared.toolParameters?.find((p: ToolParamWithId) => p.toolRequestId === req.id);
            if (hasParams) {
                req.status = 'param_generated';
            }
        });

        if (shared.toolRequests && shared.toolRequests.length > 0) {
            // Add assistant message with tool calls
            const toolCalls = shared.toolRequests.map((req: ToolRequestWithId) => {
                const context = getToolContext(req.id, shared);
                return {
                    id: req.id, // Use real tc_ IDs (39 chars, under OpenAI 40 char limit)
                    type: "function" as const,
                    function: {
                        name: req.toolName,
                        arguments: JSON.stringify(context.params?.parameters || {})
                    }
                };
            });

            if (shared.messages === undefined) {
                shared.messages = [];
            }

            // add the tool call to the last message, if its an assistant message
            if (shared.messages[shared.messages.length - 1].role === "assistant") {
                console.log("Adding tool calls to last assistant message");
                shared.messages[shared.messages.length - 1].tool_calls = toolCalls;
            }
            else {
                console.log("Adding new assistant message with tool calls");
                shared.messages?.push({
                    role: "assistant",
                    content: "I'll help you find that information using our available tools.",
                    tool_calls: toolCalls
                });
            }
        }
        
        // Parameter generation summary is now emitted via events instead of console.log
        return "tool_execution";
    }
}
 