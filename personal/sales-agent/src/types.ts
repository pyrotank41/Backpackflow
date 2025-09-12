/**
 * Type definitions for the Conversational Sales Agent
 */

export interface ConversationMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

export interface ToolUsage {
    toolName: string;
    parameters: any;
    result: any;
    timestamp: Date;
}

export interface ToolHistoryEntry {
    messageIndex: number; // Which conversation turn this tool was used
    toolName: string;
    parameters: any;
    result: any;
    timestamp: Date;
    relevantToCurrentQuery?: boolean;
}

export interface ConversationalSalesStorage {
    conversationId: string;
    messages: ConversationMessage[];
    currentMessage: string;
    currentResponse: string;
    
    // Tool tracking
    toolsUsed: ToolUsage[];
    toolHistory: ToolHistoryEntry[]; // For context continuity
}

export interface AgentConfig {
    agent: {
        name: string;
        model: string;
        temperature: number;
    };
    prompts: {
        core_context: string;
        agent_thinking: string;
        response_generation: string;
    };
    tools: Record<string, ToolConfig>;
}

export interface ToolConfig {
    description: string;
    parameters: Record<string, any>;
    example?: string;
}

export interface CohesiveAnalysis {
    conversation_analysis: {
        customer_needs: string[];
        previously_addressed_needs: string[];
        buying_signals: string[];
        conversation_stage: 'discovery' | 'interest' | 'consideration' | 'decision';
        rapport_level: 'new' | 'building' | 'established';
    };
    tool_history_analysis: {
        relevant_previous_results: string[];
        information_gaps: string[];
        avoid_redundant_calls: boolean;
    };
    tool_decision: {
        needsTool: boolean;
        toolName?: string;
        toolParameters?: any;
        reasoning: string;
    };
    response_strategy: {
        tone: 'consultative' | 'informative' | 'friendly' | 'urgent';
        priorities: string[];
        context_references: string[];
        tool_history_references: string[];
    };
}

export type ToolFunction = (parameters: any) => Promise<any>;
