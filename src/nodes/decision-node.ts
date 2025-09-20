import { z } from 'zod';
import { BaseLLMNode, LLMNodeConfig } from './base-llm-node';
import { 
    DecisionNodeStorage, 
    ToolRequestWithId, 
    generateToolRequestId 
} from './types';

// ===== DECISION NODE CONFIGURATION =====

export interface DecisionNodeConfig extends LLMNodeConfig {
    decisionSchema?: any;  // Custom Zod schema for decision output
}

// ===== DEFAULT DECISION SCHEMA =====

export const DefaultDecisionSchema = z.object({
    action: z.enum(["tool_call_request", "generate_final_response"]).describe("whether to call tools or provide final response"),
    tool_requests: z.array(z.object({
        toolName: z.string().describe("name of the tool to call"),
        brief: z.string().describe("single sentence on what we want from the tool")
    })).optional().describe("tool requests to call - only required when action is tool_call_request")
});

// ===== DECISION NODE =====

export class DecisionNode extends BaseLLMNode {
    private decisionSchema: any;
    
    constructor(config: DecisionNodeConfig = {}) {
        super(config);
        this.decisionSchema = config.decisionSchema || DefaultDecisionSchema;
    }
    
    protected getDefaultSystemPrompt(): string {
        return `You are a decision agent that decides whether to call tools or provide a final response.

Decision Guidelines:
- Choose "tool_call_request" if you need to call tools to fulfill the request
- Choose "generate_final_response" if you have sufficient information or have reached the search limit
- Be specific about the tools to call to get the most relevant information
- Consider the complexity of the question when deciding`;
    }
    
    async prep(shared: DecisionNodeStorage): Promise<unknown> {
        if (shared.currentDecision !== undefined) {
            shared.currentDecision = undefined;
        }
        return {
            messages: shared.messages || [],
            available_tools: shared.available_tools || []
        };
    }
    
    async exec(prepRes: any): Promise<unknown> {
        const prep_messages = prepRes.messages.map((m: any) => `${m.role}: ${m.content}`).join("\n");

        const messages = [
            {
                role: "system",
                content: `${this.systemPrompt}

Tools available:
${prepRes.available_tools.map((t: any) => `- ${t.name}: ${t.description}`).join("\n")}`
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

        return { decision };
    }
    
    async post(shared: DecisionNodeStorage, prepRes: any, execRes: any): Promise<string> {
        const decision = execRes.decision;

        console.log('Decision:', decision);
        
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

        return decision.action;
    }
}
