import { z } from 'zod';
import { BaseLLMNode, LLMNodeConfig, EventStreamingConfig } from './base-llm-node';
import { StreamEventType } from '../events/event-streamer';
import { 
    DecisionNodeStorage, 
    ToolRequestWithId, 
    generateToolRequestId 
} from './types';

// ===== DECISION NODE CONFIGURATION =====

export interface DecisionNodeConfig extends LLMNodeConfig, EventStreamingConfig {
    decisionSchema?: any;  // Custom Zod schema for decision output
    maxTurns?: number;  // Maximum number of decision loop turns before forcing final answer
}

// ===== DEFAULT DECISION SCHEMA =====

export const DefaultDecisionSchema = z.object({
    action: z.enum(["tool_call_request", "generate_final_response"]).describe("whether to call tools or provide final response"),
    reason: z.string().describe("reason for the decision, add the step by step reasoning, if calling tools, mention the tool name and why its needed. the goal here is to create a blue print for the next node to follow"),
    tool_requests: z.array(z.object({
        toolName: z.string().describe("name of the tool to call"),
        brief: z.string().describe("single sentence on what we want from the tool")
    })).optional().describe("tool requests to call - only required when action is tool_call_request")
});

// ===== DECISION NODE =====

export class DecisionNode extends BaseLLMNode {
    private decisionSchema: any;
    private maxTurns: number;
    
    constructor(config: DecisionNodeConfig) {
        super(config);
        this.decisionSchema = config.decisionSchema || DefaultDecisionSchema;
        this.maxTurns = config.maxTurns || 10; // Default to 10 turns max
    }
    
    protected getDefaultSystemPrompt(): string {
        return `You are a decision agent that decides whether to call tools or provide a final response.

Decision Guidelines:
- Choose "tool_call_request" if you need to call tools to fulfill the request
- return NO tool call request if you have sufficient information for user
- Be specific about the tools to call to get the most relevant information
- Consider the complexity of the question when deciding
- If you have insufficient information for user query, like the not enough informationn to call a tool, use the generate_final_response action to ask the user for more information`;
    }
    
    private formatToolInfo(tool: any): string {
        let info = `- ${tool.name}: ${tool.description}`;
        
        if (tool.inputSchema && tool.inputSchema.properties) {
            const properties = tool.inputSchema.properties;
            const required = tool.inputSchema.required || [];
            
            info += `\n  Parameters:`;
            
            Object.entries(properties).forEach(([paramName, paramSchema]: [string, any]) => {
                const isRequired = required.includes(paramName);
                const requiredMarker = isRequired ? ' (required)' : ' (optional)';
                const description = paramSchema.description || '';
                const type = paramSchema.type || 'any';
                
                info += `\n    - ${paramName} (${type})${requiredMarker}: ${description}`;
            });
        }
        
        return info;
    }
    
    async prep(shared: DecisionNodeStorage): Promise<unknown> {
        if (shared.currentDecision !== undefined) {
            shared.currentDecision = undefined;
        }
        
        // Initialize turn counting
        if (shared.turnCount === undefined) {
            shared.turnCount = 0;
        }
        if (shared.maxTurns === undefined) {
            shared.maxTurns = this.maxTurns;
        }
        
        // Increment turn count
        shared.turnCount++;
        
        return {
            messages: shared.messages || [],
            available_tools: shared.available_tools || [],
            turnCount: shared.turnCount,
            maxTurns: shared.maxTurns
        };
    }
    
    async exec(prepRes: any): Promise<unknown> {
        // Emit progress event
        this.emitEvent(StreamEventType.PROGRESS, { status: 'making_decision' });
        
        // Check if we've reached the maximum number of turns
        if (prepRes.turnCount >= prepRes.maxTurns) {
            // Force final answer when max turns reached
            const forcedDecision = {
                action: "generate_final_response",
                reason: `Maximum number of decision turns (${prepRes.maxTurns}) reached. Providing final response with available information.`,
                tool_requests: []
            };
            
            // Emit completion event with forced decision details
            this.emitEvent(StreamEventType.METADATA, { 
                decision_made: forcedDecision.action,
                tool_requests: 0,
                turn_limit_reached: true,
                turn_count: prepRes.turnCount,
                max_turns: prepRes.maxTurns,
                decision_details: {
                    action: forcedDecision.action,
                    tool_requests: []
                }
            });
            
            return { decision: forcedDecision };
        }
        
        const prep_messages = prepRes.messages.map((m: any) => `${m.role}: ${m.content}`).join("\n");

        const messages = [
            {
                role: "system",
                content: `${this.systemPrompt}

Tools available:
${prepRes.available_tools.map((t: any) => this.formatToolInfo(t)).join("\n\n")}`
            },
            {
                role: "user",
                content: `
Current context:
${prep_messages}

Should I call tools or provide the final response?`
            }
        ];

        const decision = await this.callLLMStructured(
            messages,
            {
                schema: this.decisionSchema,
                name: "Decision"
            }
        );

        // Emit completion event with decision details
        this.emitEvent(StreamEventType.METADATA, { 
            decision_made: decision.action,
            tool_requests: decision.tool_requests?.length || 0,
            turn_count: prepRes.turnCount,
            max_turns: prepRes.maxTurns,
            decision_details: {
                action: decision.action,
                tool_requests: decision.tool_requests || []
            }
        });

        return { decision };
    }
    
    async post(shared: DecisionNodeStorage, prepRes: any, execRes: any): Promise<string> {
        const decision = execRes.decision;

        // Decision details are now emitted via events instead of console.log
        
        // Convert tool requests to include IDs and initialize tracking arrays
        if (decision.action === "tool_call_request" && decision.tool_requests) {
            const toolRequestsWithIds: ToolRequestWithId[] = decision.tool_requests.map((req: any) => ({
                id: generateToolRequestId(),
                toolName: req.toolName,
                brief: req.brief,
                status: 'pending' as const
            }));
            
            shared.currentDecision = {
                ...decision,
                tool_requests: toolRequestsWithIds
            };
            
            // Initialize tracking arrays
            shared.toolRequests = toolRequestsWithIds;
            shared.toolParameters = [];
            shared.toolExecutionResults = [];
        } else {
            shared.currentDecision = decision;
        }

        if (shared.messages) {
            shared.messages?.push({
                role: "assistant",
                content: "thought: " + decision.reason
            });
        }

        return decision.action;
    }
}
