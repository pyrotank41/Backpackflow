/**
 * Conversational Sales Agent with Cohesive Prompt System
 */

import { Node } from '../../../src/pocketflow';
import { 
    ConversationalSalesStorage, 
    AgentConfig, 
    CohesiveAnalysis, 
    ToolFunction, 
    ConversationMessage,
    ToolHistoryEntry 
} from './types';

export class ConversationalSalesAgent extends Node<ConversationalSalesStorage> {
    private config: AgentConfig;
    private tools: Map<string, ToolFunction> = new Map();
    private llm: any; // Will be injected
    
    constructor(config: AgentConfig, tools: Record<string, ToolFunction>, llmProvider: any) {
        super();
        this.config = config;
        this.llm = llmProvider;
        
        // Register tools
        Object.entries(tools).forEach(([name, fn]) => {
            this.tools.set(name, fn);
        });
    }
    
    async prep(shared: ConversationalSalesStorage): Promise<{
        coreContext: string,
        conversationHistory: ConversationMessage[],
        currentMessage: string,
        toolHistoryContext: string,
        completeToolHistory: string
    }> {
        // Initialize storage if needed
        if (!shared.messages) {
            shared.messages = [{
                role: 'system',
                content: this.config.prompts.core_context,
                timestamp: new Date()
            }];
        }
        
        if (!shared.toolHistory) {
            shared.toolHistory = [];
        }
        
        if (!shared.toolsUsed) {
            shared.toolsUsed = [];
        }
        
        // Build tool history contexts
        const toolHistoryContext = this.buildToolHistoryContext(shared.toolHistory);
        const completeToolHistory = this.buildCompleteToolHistory(shared.toolHistory);
        
        return {
            coreContext: this.config.prompts.core_context,
            conversationHistory: shared.messages,
            currentMessage: shared.currentMessage,
            toolHistoryContext,
            completeToolHistory
        };
    }
    
    async exec(prepRes: {
        coreContext: string,
        conversationHistory: ConversationMessage[],
        currentMessage: string,
        toolHistoryContext: string,
        completeToolHistory: string
    }): Promise<{
        response: string,
        toolUsed?: any,
        analysis: CohesiveAnalysis
    }> {
        // Generate unified analysis considering conversation + tool history
        const analysis = await this.generateCohesiveAnalysis(prepRes);
        
        let toolResult = null;
        if (analysis.tool_decision.needsTool && !analysis.tool_history_analysis.avoid_redundant_calls) {
            const tool = this.tools.get(analysis.tool_decision.toolName!);
            if (tool) {
                try {
                    const result = await tool(analysis.tool_decision.toolParameters);
                    toolResult = {
                        name: analysis.tool_decision.toolName,
                        parameters: analysis.tool_decision.toolParameters,
                        result: result
                    };
                } catch (error) {
                    console.error(`Tool execution failed:`, error);
                    // Continue without tool result
                }
            }
        }
        
        // Generate final response with complete context
        const response = await this.generateCohesiveResponse(prepRes, analysis, toolResult);
        
        return {
            response,
            toolUsed: toolResult,
            analysis
        };
    }
    
    async post(shared: ConversationalSalesStorage, prepRes: any, execRes: any): Promise<string> {
        // Add user message to conversation
        shared.messages.push({
            role: 'user',
            content: shared.currentMessage,
            timestamp: new Date()
        });
        
        // Add tool usage if any
        if (execRes.toolUsed) {
            // Traditional tool tracking
            shared.toolsUsed.push({
                toolName: execRes.toolUsed.name,
                parameters: execRes.toolUsed.parameters,
                result: execRes.toolUsed.result,
                timestamp: new Date()
            });
            
            // Enhanced tool history for context
            shared.toolHistory.push({
                messageIndex: shared.messages.length, // Current message index
                toolName: execRes.toolUsed.name,
                parameters: execRes.toolUsed.parameters,
                result: execRes.toolUsed.result,
                timestamp: new Date(),
                relevantToCurrentQuery: true
            });
        }
        
        // Add assistant response
        shared.messages.push({
            role: 'assistant',
            content: execRes.response,
            timestamp: new Date()
        });
        
        shared.currentResponse = execRes.response;
        
        return "success";
    }
    
    private async generateCohesiveAnalysis(prepRes: any): Promise<CohesiveAnalysis> {
        const conversationHistory = this.formatConversationHistory(prepRes.conversationHistory);
        
        const prompt = this.replacePromptVariables(this.config.prompts.agent_thinking, {
            core_context: prepRes.coreContext,
            conversation_history: conversationHistory,
            tool_history_context: prepRes.toolHistoryContext,
            current_message: prepRes.currentMessage
        });
        
        try {
            const result = await this.llm.generate(prompt);
            return JSON.parse(result);
        } catch (error) {
            console.error('Failed to generate analysis:', error);
            // Return a fallback analysis
            return this.getFallbackAnalysis(prepRes.currentMessage);
        }
    }
    
    private async generateCohesiveResponse(
        prepRes: any, 
        analysis: CohesiveAnalysis, 
        toolResult?: any
    ): Promise<string> {
        const conversationHistory = this.formatConversationHistory(prepRes.conversationHistory);
        
        let currentToolContext = "No new tool information.";
        let toolInstruction = "Use conversation context and previous tool results";
        
        if (toolResult) {
            currentToolContext = `Current tool: ${toolResult.name}\nResults: ${JSON.stringify(toolResult.result, null, 2)}`;
            toolInstruction = "Integrate new tool results with previous findings and conversation context";
        }
        
        const prompt = this.replacePromptVariables(this.config.prompts.response_generation, {
            core_context: prepRes.coreContext,
            conversation_history: conversationHistory,
            complete_tool_history: prepRes.completeToolHistory,
            current_message: prepRes.currentMessage,
            agent_analysis: JSON.stringify(analysis, null, 2),
            current_tool_context: currentToolContext,
            tool_instruction: toolInstruction,
            relevant_previous_results: analysis.tool_history_analysis.relevant_previous_results.join(', ') || 'none',
            context_references: analysis.response_strategy.context_references.join(', '),
            tool_history_references: analysis.response_strategy.tool_history_references.join(', ') || 'none',
            previously_addressed_needs: analysis.conversation_analysis.previously_addressed_needs.join(', ') || 'none',
            response_tone: analysis.response_strategy.tone,
            conversation_stage: analysis.conversation_analysis.conversation_stage,
            response_priorities: analysis.response_strategy.priorities.join(', ')
        });
        
        try {
            return await this.llm.generate(prompt);
        } catch (error) {
            console.error('Failed to generate response:', error);
            return "I apologize, but I'm having trouble processing your request right now. Could you please try again?";
        }
    }
    
    private buildToolHistoryContext(toolHistory: ToolHistoryEntry[]): string {
        if (toolHistory.length === 0) {
            return "No previous tool usage in this conversation.";
        }
        
        return "Previous tools used:\n" + toolHistory.map((entry, index) => {
            const summary = this.summarizeToolResult(entry.result);
            return `${index + 1}. ${entry.toolName}(${JSON.stringify(entry.parameters)}) → ${summary}`;
        }).join('\n');
    }
    
    private buildCompleteToolHistory(toolHistory: ToolHistoryEntry[]): string {
        if (toolHistory.length === 0) {
            return "No tool history available.";
        }
        
        return toolHistory.map((entry, index) => {
            return `Tool Call ${index + 1} (Message ${entry.messageIndex}):
Tool: ${entry.toolName}
Parameters: ${JSON.stringify(entry.parameters, null, 2)}
Result: ${JSON.stringify(entry.result, null, 2)}
Timestamp: ${entry.timestamp.toISOString()}
---`;
        }).join('\n');
    }
    
    private summarizeToolResult(result: any): string {
        if (typeof result === 'object' && result !== null) {
            if (result.name && result.price) {
                return `Found ${result.name} at ${result.price}`;
            } else if (Array.isArray(result)) {
                return `Found ${result.length} results`;
            } else if (result.error) {
                return `Error: ${result.error}`;
            } else {
                return `Result: ${Object.keys(result).join(', ')}`;
            }
        }
        return String(result);
    }
    
    private formatConversationHistory(history: ConversationMessage[]): string {
        return history
            .filter(msg => msg.role !== 'system')
            .slice(-8) // Keep last 8 messages for context
            .map((msg, index) => {
                const messageNum = history.length - 8 + index + 1;
                return `Message ${messageNum} - ${msg.role.toUpperCase()}: ${msg.content}`;
            })
            .join('\n');
    }
    
    private replacePromptVariables(template: string, variables: Record<string, string>): string {
        let result = template;
        Object.entries(variables).forEach(([key, value]) => {
            const placeholder = `{${key}}`;
            result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
        });
        return result;
    }
    
    private getFallbackAnalysis(currentMessage: string): CohesiveAnalysis {
        return {
            conversation_analysis: {
                customer_needs: ["general inquiry"],
                previously_addressed_needs: [],
                buying_signals: [],
                conversation_stage: "discovery",
                rapport_level: "new"
            },
            tool_history_analysis: {
                relevant_previous_results: [],
                information_gaps: [],
                avoid_redundant_calls: false
            },
            tool_decision: {
                needsTool: false,
                reasoning: "Fallback analysis - using general knowledge"
            },
            response_strategy: {
                tone: "friendly",
                priorities: ["acknowledge customer"],
                context_references: [],
                tool_history_references: []
            }
        };
    }
}
