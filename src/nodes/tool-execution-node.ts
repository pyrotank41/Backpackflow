import { ParallelBatchNode } from '../pocketflow';
import { ToolRequest } from './mcp-core';
import { EventStreamer, StreamEventType } from '../events/event-streamer';
import { EventStreamingConfig } from './base-llm-node';
import { 
    ToolExecutionNodeStorage, 
    ToolExecutionResultWithId,
    getToolContext 
} from './types';

// ===== TOOL EXECUTION NODE CONFIGURATION =====

export interface ToolExecutionNodeConfig extends EventStreamingConfig {
    // Additional config options can be added here
}

// ===== TOOL EXECUTION NODE =====

export class ToolExecutionNode extends ParallelBatchNode {
    // Event streaming properties
    protected eventStreamer?: EventStreamer;
    protected namespace: string;
    
    constructor(config: ToolExecutionNodeConfig = {}) {
        super();
        
        // Initialize event streaming (now using clean EventStreamingConfig)
        this.eventStreamer = config.eventStreamer;
        this.namespace = config.namespace || this.constructor.name.toLowerCase();
    }
    
    /**
     * Helper method to emit events safely (only if eventStreamer is available)
     */
    protected emitEvent(eventType: StreamEventType, content: any): void {
        if (this.eventStreamer) {
            this.eventStreamer.emitEvent(this.namespace, eventType, content, this.constructor.name);
        }
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
        
        // Emit progress event
        this.emitEvent(StreamEventType.PROGRESS, { 
            status: 'executing_tool',
            tool: tool_request.toolName,
            tool_id: toolRequestId
        });
        
        // Tool execution details are now emitted via events instead of console.log

        const result = await tool_manager.executeTool(tool_request);
        
        // Emit completion event with execution details
        this.emitEvent(StreamEventType.METADATA, {
            tool_executed: true,
            tool: tool_request.toolName,
            tool_id: toolRequestId,
            success: result.success,
            result_size: result.content?.length || 0,
            execution_request: {
                toolName: tool_request.toolName,
                arguments: tool_request.arguments
            },
            execution_result: result
        });
        
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
        
        return "response_generation";
    }
    
}
