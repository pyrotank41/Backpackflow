import { Flow, Node, ParallelBatchNode } from "../../src/pocketflow";
import { MCPServerManager, MCPServerConfig, ToolRequest } from "../../src/nodes/mcp-core";
import * as readline from 'readline';
import OpenAI from "openai";
import { z } from 'zod';
import Instructor from '@instructor-ai/instructor';
import { randomUUID } from 'crypto';

// Real UUID generator for tool requests
function generateToolRequestId(): string {
    return `tool_req_${randomUUID()}`;
}

// Helper function to convert JSON Schema to Zod schema
function jsonSchemaToZod(schema: any, definitions: any = {}): any {
    if (schema.$ref) {
        const refKey = schema.$ref.replace('#/$defs/', '');
        return jsonSchemaToZod(definitions[refKey], definitions);
    }

    switch (schema.type) {
        case 'string':
            return z.string().describe(schema.description || schema.title || '');
        
        case 'number':
        case 'integer':
            return z.number().describe(schema.description || schema.title || '');
        
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
            // Handle anyOf (union types) - for now, just use string as fallback
            if (schema.anyOf) {
                // Find the string option or use first non-null option
                const stringOption = schema.anyOf.find((opt: any) => opt.type === 'string');
                if (stringOption) {
                    return z.string().optional().describe(schema.description || schema.title || '');
                }
            }
            return z.string().describe(schema.description || schema.title || '');
    }
}


import { config } from 'dotenv';
import path from 'path';
config({ path: path.join(__dirname, '.env') }); // Load environment variables from .env file in this directory


const mcp_server_configs: MCPServerConfig[] = [
    
    // for local server
    {
        name: "erp_sales",
        command: "sh",
        args: ["-c", "cd /Users/karansinghkochar/Documents/GitHub/product-quote-mcp && uv run python -m src.standalone_erp_server"],
        transport: "stdio"
}
    // {
    //     name: "erp_sales_url",
    //     url: "http://localhost:8000/llm/mcp/",
    //     transport: "sse",
    //     bearerToken: "eyJhbGciOiJSUzI1NiIsImtpZCI6InNzb19vaWRjX2tleV9wYWlyXzAxSlowSFYwSkRDQ0o2NksxSzkyNzVIVzJTIn0.eyJhdWQiOiJodHRwczovL2FwaS53b3Jrb3MuY29tIiwiaXNzIjoiaHR0cHM6Ly9hcGkud29ya29zLmNvbSIsInN1YiI6InVzZXJfMDFKWkUwMU41WEpFOEFEMENTMTJCTkM1V0oiLCJzdWJfdHlwZSI6ImF1dGhraXQiLCJqdGkiOiIwMUs1MlhaTlBROTVDNlZTTkFNMjhRUFJEViIsIm9yZ19pZCI6Im9yZ18wMUswUEc5M0Q2RlBBV1FHNDhGMzE3MzJQTiIsInNpZCI6IndpZGdldF9zZXNzaW9uXzAxSzUyWFpOTkZUTlg4TTMyOThGNkhQWDU1IiwicGVybWlzc2lvbnMiOlsid2lkZ2V0czp1c2Vycy10YWJsZTptYW5hZ2UiXSwiZXhwIjoxNzU3ODE3NTIxLCJpYXQiOjE3NTc4MTM5MjF9.My4pWMpsIwUQ1bwk2M0DE8M6yQ4OIen7vY4XKFYVZh0aLRtB_f4BvSOYzFVtTm6ozfayTxPpEVLshiaMSpqB0jTYN_4NxiepcNDMuTsOMbQSNloZyA7CI56STDp9H-9M8tU8Vw0_Rxj9W2GSgj7QMZCvT29DkLAeMew3RQqVRk4OCBIq81o_22IXAvFc0z_fSv0Hu2ejFGeufryds0k-uuF9pouRGEIWs8_FyJMnhpMmNbZ34g1VEVhJW0cCA9inqy0CG75qWyqbttH72l4zemy-9nodH7v0KYULHpeJzrnpPju6fEqVQdtRF_4x8Zmx4x6ZSy_IX4_HABuG-xOm-Q"
    // }
]


// Decision schema - for the agent to decide next action
const DecisionSchema = z.object({
    action: z.enum(["tool_call_request", "generate_final_response"]).describe("whether to call tools or provide final response"),
    tool_requests: z.array(z.object({
        toolName: z.string().describe("name of the tool to call"),
        brief: z.string().describe("single sentence on what we want from the tool")
    })).optional().describe("tool requests to call - only required when action is tool_call_request")
});

// Improved interfaces for tracking
interface ToolRequestWithId {
    id: string;
    toolName: string;
    brief: string;
    status: 'pending' | 'param_generated' | 'executing' | 'completed' | 'failed';
}

interface ToolParamWithId {
    toolRequestId: string;
    parameters: any;
    serverId: string;
}

interface ToolExecutionResultWithId {
    toolRequestId: string;
    executionResult: any;
}

// Helper function to access related tool data via toolRequestId
function getToolContext(toolRequestId: string, shared: any) {
    const request = shared.toolRequests.find((r: ToolRequestWithId) => r.id === toolRequestId);
    const params = shared.toolParameters.find((p: ToolParamWithId) => p.toolRequestId === toolRequestId);
    const result = shared.toolExecutionResults.find((r: ToolExecutionResultWithId) => r.toolRequestId === toolRequestId);
    const tool = shared.available_tools.find((t: any) => t.name === request?.toolName);
    
    return { request, params, result, tool };
}

export function getOpenaiInstructorClient() {
  
    const oai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || 'your-api-key'
    });

    return Instructor({
        client: oai,
        mode: "FUNCTIONS"
    });
}

class DecisionNode extends Node {
    private client: any;

    constructor() {
        super();
        this.client = getOpenaiInstructorClient();
    }
    async prep(shared: any): Promise<unknown> {
        if (shared.currentDecision !== undefined) {
            shared.currentDecision = undefined;
        }
        return {messages: shared.messages, available_tools: shared.available_tools};
    }
    
    async exec(prepRes: any): Promise<unknown> {

        const prep_messages = prepRes.messages.map((m: any) => `${m.role}: ${m.content}`).join("\n");

        const decision = await this.client.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a decision agent that decides whether to call tools or provide a final response.

Decision Guidelines:
- Choose "tool_call_request" if you need to call tools to fulfill the request
- Choose "generate_final_response" if you have sufficient information or have reached the search limit
- Be specific about the tools to call to get the most relevant information
- Consider the complexity of the question when deciding

Tools available:
${prepRes.available_tools.map((t: any) => `- ${t.name}: ${t.description}`).join("\n")}`
                
                },
                {
                    role: "user",
                    content: `
Current context:
${prep_messages}

Should I call tools or provide the final response?`}
            ],
            model: "gpt-4o",
            response_model: {
                schema: DecisionSchema,
                name: "Decision"
            },
            temperature: 0.0
        });

        return {decision: decision};
    }
    
    async post(shared: any, prepRes: any, execRes: any) {

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


class ToolParamGenerationNode extends ParallelBatchNode {

    private client: any;

    constructor() {
        super();
        this.client = getOpenaiInstructorClient();
    }

    // this node will generate the parameters for the tool call using the tool name
    async prep(shared: any): Promise<unknown[]> {
        
        if (shared.currentDecision.action === "tool_call_request") {
            const toolRequests: ToolRequestWithId[] = shared.toolRequests;
            
            // Create an array of prep objects for each tool request
            return toolRequests.map((toolRequest: ToolRequestWithId) => {
                const Tool = shared.available_tools.find((t: any) => t.name === toolRequest.toolName);
                
                if (!Tool) {
                    throw new Error(`Tool ${toolRequest.toolName} not found`);
                }

                // Create a Zod schema from the tool's input schema using proper conversion
                const toolParamSchema = jsonSchemaToZod(Tool.inputSchema, Tool.inputSchema.$defs || {});

                const system_prompt = `You are a tool parameter generation agent. You will be given a tool name and a brief description of the tool. You will need to generate the parameters for the tool.`
                const user_prompt = `
                You are a tool parameter generation agent. You will be given a tool name and a brief description of the tool. You will need to generate the parameters for the tool.

                Tool name: ${toolRequest.toolName}
                Tool description: ${Tool.description}
                Tool parameter brief (what we want from the tool): ${toolRequest.brief}
                
                Required parameters: ${JSON.stringify(Tool.inputSchema.properties, null, 2)}
                `;

                const param_generation_messages = [
                    { role: 'system', content: system_prompt },
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
            model: "gpt-4o",
            response_model: {
                schema: toolParamSchema,
                name: "ToolParamGeneration"
            },
            temperature: 0.0
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
    
    async post(shared: any, prepRes: any[], execRes: any[]): Promise<string> {
        // Store parameters in the new tracking structure
        shared.toolParameters = execRes.map((result: any) => ({
            toolRequestId: result.toolRequestId,
            parameters: result.parameters,
            serverId: result.serverId
        } as ToolParamWithId));
        
        // Update tool request statuses
        shared.toolRequests.forEach((req: ToolRequestWithId) => {
            const hasParams = shared.toolParameters.find((p: ToolParamWithId) => p.toolRequestId === req.id);
            if (hasParams) {
                req.status = 'param_generated';
            }
        });
        
        console.log('Generated parameters for all tools:', shared.toolParameters);
        return "tool_execution";
    }
}

class ToolExecutionNode extends ParallelBatchNode {
    async prep(shared: any): Promise<unknown[]> {
        
        const res = []

        for (const toolParam of shared.toolParameters) {
            // Get tool context using helper function
            const context = getToolContext(toolParam.toolRequestId, shared);
            
            if (!context.request || !context.tool) {
                throw new Error(`Missing context for tool request ${toolParam.toolRequestId}`);
            }
            
            const toolRequest: ToolRequest = {
                toolName: context.request.toolName,
                arguments: toolParam.parameters, // Already cleaned in ToolParamGenerationNode
                serverId: toolParam.serverId
            }
            res.push({
                tool_manager: shared.tool_manager, 
                tool_request: toolRequest,
                toolRequestId: toolParam.toolRequestId
            });
        }
        return res;
    }
    
    async exec(prepRes: any): Promise<unknown> {
        const tool_manager = prepRes.tool_manager;
        const tool_request = prepRes.tool_request;
        const toolRequestId = prepRes.toolRequestId;
        
        console.log(`Executing tool ${tool_request.toolName} (ID: ${toolRequestId}):`, tool_request);

        const result = await tool_manager.executeTool(tool_request);
        return {
            toolRequestId: toolRequestId,
            executionResult: result
        };
    }

    async post(shared: any, prepRes: any[], execRes: any[]): Promise<string> {
        // Store execution results in the tracking structure
        shared.toolExecutionResults = execRes.map((result: any) => ({
            toolRequestId: result.toolRequestId,
            executionResult: result.executionResult
        } as ToolExecutionResultWithId));
        
        // Update tool request statuses
        shared.toolRequests.forEach((req: ToolRequestWithId) => {
            const hasResult = shared.toolExecutionResults.find((r: ToolExecutionResultWithId) => r.toolRequestId === req.id);
            if (hasResult) {
                req.status = hasResult.executionResult.success ? 'completed' : 'failed';
            }
        });
        
        console.log('Tool execution results:', shared.toolExecutionResults);
        return "response_generation";
    }
}

class FinalAnswerNode extends Node {
    private client: any;

    constructor() {
        super();
        this.client = getOpenaiInstructorClient();
    }

    async prep(shared: any): Promise<unknown> {
        // Gather all context for final response generation
        const originalRequest = shared.messages[0].content;
        const toolResults = shared.toolExecutionResults || [];
        
        // Create context string with tool results
        let toolResultsContext = '';
        for (const result of toolResults) {
            const context = getToolContext(result.toolRequestId, shared);
            if (context.request && result.executionResult.success) {
                toolResultsContext += `\n\nTool: ${context.request.toolName}
Brief: ${context.request.brief}
Result: ${JSON.stringify(result.executionResult.content, null, 2)}`;
            }
        }

        return {
            originalRequest,
            toolResultsContext,
            hasToolResults: toolResults.length > 0
        };
    }

    async exec(prepRes: any): Promise<unknown> {
        const { originalRequest, toolResultsContext, hasToolResults } = prepRes;

        if (!hasToolResults) {
            // Direct response without tools
            const response = await this.client.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful sales assistant. Provide a clear, professional response to the user's request."
                    },
                    {
                        role: "user",
                        content: originalRequest
                    }
                ],
                model: "gpt-4o",
                temperature: 0.1
            });
            return { finalAnswer: response.choices[0].message.content };
        }

        // Generate response using tool results
        const response = await this.client.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a professional sales assistant. Based on the tool execution results, provide a comprehensive, helpful response to the user's request. 

Guidelines:
- Be clear and concise
- Include specific product details when available (SKU, name, price, etc.)
- Address all parts of the user's request
- If some information wasn't found, mention it politely
- Use a professional but friendly tone
- Format the response nicely for readability`
                },
                {
                    role: "user", 
                    content: `Original request: ${originalRequest}

Tool execution results:${toolResultsContext}

Please provide a comprehensive response based on these results.`
                }
            ],
            model: "gpt-4o",
            temperature: 0.1
        });

        return { finalAnswer: response.choices[0].message.content };
    }

    async post(shared: any, prepRes: any, execRes: any): Promise<string | undefined> {
        shared.finalAnswer = execRes.finalAnswer;
        console.log('\n=== FINAL ANSWER ===');
        console.log(execRes.finalAnswer);
        console.log('===================\n');
        
        // Return undefined to signal end of flow
        return undefined;
    }
}


async function main() {
    const mcp_server_manager = new MCPServerManager();
    
    await mcp_server_manager.connectToServers(mcp_server_configs);
    const available_tools = await mcp_server_manager.discoverTools();

    const sharedStorage = {
        messages: [{
            role: 'user', content: 'please generate a quote for a 10 amp mcb, c curve and 20 amp mcb, c curve. also, do we have a customer name starting with "prachi"' } ],
        available_tools: available_tools,
        tool_manager: mcp_server_manager
    }
    const decision_node = new DecisionNode();
    const tool_param_generation_node = new ToolParamGenerationNode();
    const tool_execution_node = new ToolExecutionNode();
    const final_answer_node = new FinalAnswerNode();
    
    // Set up the flow connections
    decision_node.on("tool_call_request", tool_param_generation_node);
    decision_node.on("generate_final_response", final_answer_node);
    tool_param_generation_node.on("tool_execution", tool_execution_node);
    tool_execution_node.on("response_generation", final_answer_node);

    const flow = new Flow(decision_node);

    await flow.run(sharedStorage);

    console.log('Flow response:', JSON.stringify(sharedStorage, null, 4));

    // const response = await decision_node.run(sharedStorage);
    // console.log('Decision response:', response);
    
    // if (response === "tool_call_request") {
    //     const tool_param_generation_response = await tool_param_generation_node.run(sharedStorage);
    //     console.log('Tool param generation response:', tool_param_generation_response);
    // }

    // const sales_agent_storage = {
    //     messages: [],
    //     mcp_server_manager: mcp_server_manager,
    //     system_prompt: "you are a sales agent for pragmaticai solutions, following are the tools available to you: {{availableTools}}, call the appropriate tools to fulfill the user's request"
    // }

    // const simpleSalesAgent = new SalesAgent();
    // const response = await simpleSalesAgent.run(sales_agent_storage);
    // console.log('Response:', response);
    // await simpleSalesAgent.exec({});

    await mcp_server_manager.disconnect();
}

main().catch(console.error);