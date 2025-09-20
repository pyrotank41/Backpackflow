import { ParallelBatchNode } from '../pocketflow';
import { LLMNodeConfig, getDefaultInstructorClient } from './base-llm-node';
import { 
    ToolParamNodeStorage, 
    ToolRequestWithId, 
    ToolParamWithId,
    jsonSchemaToZod 
} from './types';

// ===== TOOL PARAM GENERATION NODE CONFIGURATION =====

export interface ToolParamNodeConfig extends LLMNodeConfig {
    // Additional config options can be added here
}

// ===== TOOL PARAM GENERATION NODE =====

export class ToolParamGenerationNode extends ParallelBatchNode {
    private client: any;
    private systemPrompt: string;
    private model: string;
    private temperature: number;

    constructor(config: ToolParamNodeConfig = {}) {
        super();
        this.client = config.instructorClient || getDefaultInstructorClient();
        this.systemPrompt = config.systemPrompt || this.getDefaultSystemPrompt();
        this.model = config.model || 'gpt-4o';
        this.temperature = config.temperature ?? 0.1;
    }
    
    protected getDefaultSystemPrompt(): string {
        return `You are a tool parameter generation agent. You will be given a tool name and a brief description of the tool. You will need to generate the parameters for the tool.`;
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

                // Create a Zod schema from the tool's input schema using proper conversion
                const toolParamSchema = jsonSchemaToZod(Tool.inputSchema, (Tool.inputSchema as any).$defs || {});

                const user_prompt = `
You are a tool parameter generation agent. You will be given a tool name and a brief description of the tool. You will need to generate the parameters for the tool.

Tool name: ${toolRequest.toolName}
Tool description: ${Tool.description}
Tool parameter brief (what we want from the tool): ${toolRequest.brief}

Required parameters: ${JSON.stringify(Tool.inputSchema.properties, null, 2)}
`;

                const param_generation_messages = [
                    { role: 'system', content: this.systemPrompt },
                    { role: 'user', content: user_prompt }
                ]

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

        const param_generation_response = await this.client.chat.completions.create({
            messages: param_generation_messages,
            model: this.model,
            response_model: {
                schema: toolParamSchema,
                name: "ToolParamGeneration"
            },
            temperature: this.temperature
        });

        console.log(`Tool param generation response for ${toolRequest.toolName} (ID: ${toolRequest.id}):`, param_generation_response);
        
        // Remove _meta field and only store essential data
        const { _meta, ...cleanParameters } = param_generation_response;
        return {
            toolRequestId: toolRequest.id,
            parameters: cleanParameters,
            serverId: prepRes.tool_in_use.serverId
        };
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
        
        console.log('Generated parameters for all tools:', shared.toolParameters);
        return "tool_execution";
    }
}
