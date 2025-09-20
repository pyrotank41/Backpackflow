import { BaseLLMNode, LLMNodeConfig } from './base-llm-node';
import { 
    FinalAnswerNodeStorage, 
    ChatMessage, 
    ToolRequestWithId, 
    ToolExecutionResultWithId,
    getToolContext 
} from './types';

// ===== FINAL ANSWER NODE CONFIGURATION =====

export interface FinalAnswerNodeConfig extends LLMNodeConfig {
    // Additional config options can be added here
    includeToolInteractionInHistory?: boolean;  // Default: true
}

// ===== FINAL ANSWER NODE =====

export class FinalAnswerNode extends BaseLLMNode {
    private includeToolInteractionInHistory: boolean;
    
    constructor(config: FinalAnswerNodeConfig = {}) {
        super(config);
        this.includeToolInteractionInHistory = config.includeToolInteractionInHistory ?? true;
    }
    
    protected getDefaultSystemPrompt(): string {
        return `You are a professional assistant. Based on the tool execution results, provide a comprehensive, helpful response to the user's request.

Guidelines:
- Be clear and concise
- Include specific details when available (SKU, name, price, etc.)
- Address all parts of the user's request
- If some information wasn't found, mention it politely
- Use a professional but friendly tone
- Format the response nicely for readability`;
    }

    async prep(shared: FinalAnswerNodeStorage): Promise<unknown> {
        const originalRequest = shared.messages?.[0]?.content || '';
        const toolResults = shared.toolExecutionResults || [];
        const hasToolResults = toolResults.length > 0;

        // Construct full OpenAI conversation format
        const conversationHistory: ChatMessage[] = [
            {
                role: "system",
                content: this.systemPrompt
            },
            {
                role: "user",
                content: originalRequest
            }
        ];

        // Add tool interaction to conversation if tools were used and option is enabled
        if (hasToolResults && shared.toolRequests && shared.toolRequests.length > 0 && this.includeToolInteractionInHistory) {
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

            conversationHistory.push({
                role: "assistant",
                content: "I'll help you find that information using our available tools.",
                tool_calls: toolCalls
            });

            // Add tool responses
            shared.toolExecutionResults?.forEach((result: ToolExecutionResultWithId) => {
                conversationHistory.push({
                    role: "tool",
                    tool_call_id: result.toolRequestId, // Use real tc_ IDs
                    content: JSON.stringify(result.executionResult.content)
                });
            });
        }

        return {
            conversationHistory,
            originalRequest,
            hasToolResults
        };
    }

    async exec(prepRes: any): Promise<unknown> {
        const { conversationHistory, hasToolResults } = prepRes;

        if (!hasToolResults) {
            // For direct responses, use a simpler system message
            const directConversation = [
                {
                    role: "system",
                    content: "You are a helpful assistant. Provide a clear, professional response to the user's request."
                },
                ...conversationHistory.slice(1) // Skip the tool-focused system message, keep user message
            ];

            const response = await this.callLLMRegular(directConversation);
            return { 
                finalAnswer: response.choices[0].message.content,
                conversationHistory: directConversation
            };
        }

        // Use the full conversation history with tool interactions
        const response = await this.callLLMRegular(conversationHistory);

        return { 
            finalAnswer: response.choices[0].message.content,
            conversationHistory: conversationHistory
        };
    }

    async post(shared: FinalAnswerNodeStorage, prepRes: any, execRes: any): Promise<string | undefined> {
        shared.finalAnswer = execRes.finalAnswer;
        
        // Update shared.messages with the complete conversation history
        // This makes the system ready for multi-turn conversations
        if (execRes.conversationHistory) {
            // Add the final assistant response to complete the conversation
            const completeConversation = [
                ...execRes.conversationHistory,
                {
                    role: "assistant",
                    content: execRes.finalAnswer
                }
            ];
            shared.messages = completeConversation;
        }
        
        console.log('\n=== FINAL ANSWER ===');
        console.log(execRes.finalAnswer);
        console.log('===================\n');
        
        // Return undefined to signal end of flow
        return undefined;
    }
}
