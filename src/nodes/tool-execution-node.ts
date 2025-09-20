import { ParallelBatchNode } from '../pocketflow';
import { ToolRequest } from './mcp-core';
import { 
    ToolExecutionNodeStorage, 
    ToolExecutionResultWithId,
    getToolContext 
} from './types';

// ===== TOOL EXECUTION NODE CONFIGURATION =====

export interface ToolExecutionNodeConfig {
    // Configuration options can be added here if needed
    // For now, this node doesn't need LLM capabilities, just MCP execution
}

// ===== TOOL EXECUTION NODE =====

export class ToolExecutionNode extends ParallelBatchNode {
    constructor(config: ToolExecutionNodeConfig = {}) {
        super();
        // This node doesn't need LLM configuration as it just executes tools
    }
    
    async prep(shared: ToolExecutionNodeStorage): Promise<unknown[]> {
        const res = []

        if (!shared.toolParameters) {
            console.warn('Tool execution node called but no tool parameters found');
            return [];
        }

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

    async post(shared: ToolExecutionNodeStorage, prepRes: any[], execRes: any[]): Promise<string> {
        // Store execution results in the tracking structure
        shared.toolExecutionResults = execRes.map((result: any) => ({
            toolRequestId: result.toolRequestId,
            executionResult: result.executionResult
        } as ToolExecutionResultWithId));
        
        // Update tool request statuses
        shared.toolRequests?.forEach((req) => {
            const hasResult = shared.toolExecutionResults?.find((r: ToolExecutionResultWithId) => r.toolRequestId === req.id);
            if (hasResult) {
                req.status = hasResult.executionResult.success ? 'completed' : 'failed';
            }
        });
        
        console.log('Tool execution results:', shared.toolExecutionResults);
        return "response_generation";
    }
}
